import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs-extra';
import {
	launchEyas,
	exitEyas,
	getUiView,
	getTestView,
	ensureEnvironmentSelected
} from './eyas-utils.mjs';

/**
 * Reads the most recently-written session recording file for this app run.
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @returns {Promise<object>}
 */
async function readLatestSession(electronApp) {
	const userDataDir = await electronApp.evaluate(({ app }) => app.getPath(`userData`));
	const sessionsDir = path.join(userDataDir, `sessions`);

	let sessionFile;
	for (let i = 0; i < 20; i++) {
		const projectDirs = (await fs.pathExists(sessionsDir)) ? await fs.readdir(sessionsDir) : [];
		for (const projectDir of projectDirs) {
			const files = await fs.readdir(path.join(sessionsDir, projectDir));
			const jsonFiles = files.filter(f => f.endsWith(`.json`));
			if (jsonFiles.length > 0) {
				sessionFile = path.join(sessionsDir, projectDir, jsonFiles[jsonFiles.length - 1]);
			}
		}
		if (sessionFile) break;
		await new Promise(resolve => setTimeout(resolve, 250));
	}

	if (!sessionFile) { throw new Error(`No session recording file was found under ${sessionsDir}`); }
	return fs.readJson(sessionFile);
}

test.describe(`Session Recording — iframe capture`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`captures a click inside a same-origin iframe with a resolved frame path`, async () => {
		test.setTimeout(30000);
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		// navigate the test layer to the recording fixture via the Links menu
		await uiPage.locator(`[data-qa="btn-nav-group-links"]`).click();
		await uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Recording Demo` }).click();

		const testPage = await getTestView(electronApp, /demo\/recording/);
		expect(testPage).toBeTruthy();

		await testPage.frameLocator(`#same-frame`).locator(`[data-testid="frame-click"]`).click();

		// the recorder preload buffers steps and only flushes to the main process every
		// FLUSH_INTERVAL_MS (2s) or at 50 steps, so give it time to flush before stopping
		await testPage.waitForTimeout(2500);

		// stop recording and persist the final session file
		await uiPage.locator(`[data-qa="btn-recording-stop"]`).click();

		const session = await readLatestSession(electronApp);
		expect(session.status).toBe(`stopped`);

		const frameClickStep = session.recording.steps.find(
			s => s.type === `click` && s.selectors?.primary === `[data-testid="frame-click"]`
		);
		expect(frameClickStep).toBeTruthy();
		expect(Array.isArray(frameClickStep.frame)).toBe(true);
	});

	test(`continues recording without crashing after a click inside a cross-origin iframe`, async () => {
		test.setTimeout(30000);
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		await uiPage.locator(`[data-qa="btn-nav-group-links"]`).click();
		await uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Recording Demo` }).click();

		const testPage = await getTestView(electronApp, /demo\/recording/);
		expect(testPage).toBeTruthy();

		const consoleErrors = [];
		testPage.on(`console`, msg => { if (msg.type() === `error`) { consoleErrors.push(msg.text()); } });
		testPage.on(`pageerror`, err => consoleErrors.push(err.message));

		// click the cross-origin frame's button, then a top-level button to prove
		// the recorder is still alive and capturing afterwards
		await testPage.frameLocator(`#cross-frame`).locator(`[data-testid="frame-click"]`).click();
		await testPage.locator(`[data-testid="top-click"]`).click();

		// let the recorder's 2s buffer flush before stopping
		await testPage.waitForTimeout(2500);

		await uiPage.locator(`[data-qa="btn-recording-stop"]`).click();

		const session = await readLatestSession(electronApp);
		expect(session.status).toBe(`stopped`);

		const topClickStep = session.recording.steps.find(
			s => s.type === `click` && s.selectors?.primary === `[data-testid="top-click"]`
		);
		expect(topClickStep).toBeTruthy();
		expect(consoleErrors).toEqual([]);
	});
});

test.describe(`Session Recording — Replay`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`replays a stopped session by re-dispatching its captured click via CDP`, async () => {
		test.setTimeout(30000);
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		await uiPage.locator(`[data-qa="btn-nav-group-links"]`).click();
		await uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Recording Demo` }).click();

		const testPage = await getTestView(electronApp, /demo\/recording/);
		expect(testPage).toBeTruthy();

		// Replay first re-dispatches the recorded navigation to this page, reloading it, before
		// re-dispatching the click — so the click counter must survive a same-origin reload.
		// sessionStorage does; a plain `window` variable would not. addInitScript re-attaches
		// the listener on that reload since the page's own scripts don't know about our counter.
		const attachClickCounter = () => {
			const attach = () => {
				const btn = document.querySelector(`[data-testid="top-click"]`);
				if (btn) {
					btn.addEventListener(`click`, () => {
						sessionStorage.setItem(`__clickCount`, String((Number(sessionStorage.getItem(`__clickCount`)) || 0) + 1));
					});
				}
			};
			// addInitScript runs at document-start, before the DOM is built — wait for it
			if (document.readyState === `loading`) { document.addEventListener(`DOMContentLoaded`, attach); }
			else { attach(); }
		};
		await testPage.evaluate(attachClickCounter);
		await testPage.addInitScript(attachClickCounter);

		await testPage.locator(`[data-testid="top-click"]`).click();
		await testPage.waitForTimeout(2500);

		await uiPage.locator(`[data-qa="btn-recording-stop"]`).click();
		await expect(uiPage.locator(`[data-qa="btn-recording-replay"]`)).toBeVisible();

		expect(await testPage.evaluate(() => sessionStorage.getItem(`__clickCount`))).toBe(`1`);

		await uiPage.locator(`[data-qa="btn-recording-replay"]`).click();

		// navigation replay reloads the page mid-poll, transiently destroying the JS execution
		// context Playwright is evaluating in — swallow that and let the poll retry
		await expect.poll(async () => {
			try { return await testPage.evaluate(() => sessionStorage.getItem(`__clickCount`)); }
			catch { return null; }
		}, { timeout: 10000 }).toBe(`2`);
		await expect(uiPage.locator(`[data-qa="recording-playback-error"]`)).not.toBeVisible();
	});
});
