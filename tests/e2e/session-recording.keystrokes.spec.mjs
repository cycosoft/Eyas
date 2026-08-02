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

// Split out of session-recording.spec.mjs, which is near its max-lines ceiling.
//
// Covers the gap that made a rich-text editor look like it wasn't recording at all: a contenteditable
// root has no `.value` to splice and reports no cursor selection, so its keystrokes fall through to a
// CDP key event — which types nothing unless `text` (or a virtual key code) rides along. The textarea
// and plain input here are the controls: they take the `.value`-splice path instead and must stay on it.

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
		const found = (await fs.pathExists(sessionsDir)) ? await fs.readdir(sessionsDir, { recursive: true }) : [];
		const jsonFiles = found.filter(f => f.endsWith(`.json`));
		if (jsonFiles.length > 0) {
			sessionFile = path.join(sessionsDir, jsonFiles[jsonFiles.length - 1]);
		}
		if (sessionFile) break;
		await new Promise(resolve => setTimeout(resolve, 250));
	}

	if (!sessionFile) { throw new Error(`No session recording file was found under ${sessionsDir}`); }
	return fs.readJson(sessionFile);
}

/** Drives the app to the recording fixture with a recording already in progress. */
async function openRecordingFixture(electronApp) {
	const uiPage = await getUiView(electronApp);
	await ensureEnvironmentSelected(uiPage);

	const homePage = await getTestView(electronApp, /eyas\.cycosoft\.com\/?$/);
	await homePage.locator(`.nav-links a`, { hasText: `Recording` }).click();

	const testPage = await getTestView(electronApp, /demo\/recording/);
	expect(testPage).toBeTruthy();

	return { uiPage, testPage };
}

test.describe(`Session Recording — keystroke capture and replay`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`captures keystrokes typed into a contenteditable root, with no cursor selection on them`, async () => {
		test.setTimeout(30000);
		const { uiPage, testPage } = await openRecordingFixture(electronApp);

		const editor = testPage.locator(`[data-testid="rich-text"]`);
		await editor.click();
		await editor.pressSequentially(`Hi`);

		const notes = testPage.locator(`[data-testid="notes"]`);
		await notes.click();
		await notes.pressSequentially(`Hi`);

		// the recorder preload buffers steps and only flushes every FLUSH_INTERVAL_MS (2s)
		await testPage.waitForTimeout(2500);
		await uiPage.locator(`[data-qa="btn-recording-stop"]`).click();

		const session = await readLatestSession(electronApp);
		expect(session.status).toBe(`stopped`);

		const keyDowns = session.recording.steps.filter(s => s.type === `keyDown`);
		expect(keyDowns.map(s => s.key)).toEqual(expect.arrayContaining([`H`, `i`]));

		// the contenteditable keystrokes carry no selection — that absence is load-bearing, it's what
		// routes them down the CDP key-event path at replay instead of the `.value` splice
		const withoutSelection = keyDowns.filter(s => s.selectionStart === undefined);
		expect(withoutSelection.length).toBeGreaterThan(0);

		// ...while the textarea's do carry one, keeping it on the splice path
		const withSelection = keyDowns.filter(s => s.selectionStart !== undefined);
		expect(withSelection.length).toBeGreaterThan(0);
	});

	test(`replays typed text back into the contenteditable root, the textarea, and the plain input`, async () => {
		test.setTimeout(45000);
		const { uiPage, testPage } = await openRecordingFixture(electronApp);

		const editor = testPage.locator(`[data-testid="rich-text"]`);
		await editor.click();
		// the trailing Backspace exercises the editing-command path (virtual key code 8) rather than
		// text insertion — `text: 'Backspace'` would type the literal word into the editor
		await editor.pressSequentially(`Rich textt`);
		await editor.press(`Backspace`);

		const notes = testPage.locator(`[data-testid="notes"]`);
		await notes.click();
		await notes.pressSequentially(`Notes`);

		const input = testPage.locator(`[data-testid="single-line"]`);
		await input.click();
		await input.pressSequentially(`Plain`);

		await expect(editor).toHaveText(`Rich text`);

		await testPage.waitForTimeout(2500);
		await uiPage.locator(`[data-qa="btn-recording-stop"]`).click();
		await expect(uiPage.locator(`[data-qa="btn-recording-replay"]`)).toBeVisible();

		await uiPage.locator(`[data-qa="btn-recording-replay"]`).click();

		// replay re-dispatches the recorded navigation first, reloading the fixture — so the fields
		// start empty again on their own, and every assertion below is replay's own doing. That reload
		// also transiently destroys the JS execution context, hence polling rather than a bare expect.
		const textOf = async selector => {
			try { return await testPage.locator(selector).innerText(); }
			catch { return null; }
		};
		const valueOf = async selector => {
			try { return await testPage.locator(selector).inputValue(); }
			catch { return null; }
		};

		// the bug this whole thread is about: before the fix this stayed empty, because a CDP key
		// event carrying only `key` dispatches to the page and inserts nothing
		await expect.poll(() => textOf(`[data-testid="rich-text"]`), { timeout: 20000 }).toBe(`Rich text`);

		// the controls — these were already working via the `.value` splice and must stay that way
		await expect.poll(() => valueOf(`[data-testid="notes"]`), { timeout: 20000 }).toBe(`Notes`);
		await expect.poll(() => valueOf(`[data-testid="single-line"]`), { timeout: 20000 }).toBe(`Plain`);

		await expect(uiPage.locator(`[data-qa="recording-playback-error"]`)).not.toBeVisible();
	});
});
