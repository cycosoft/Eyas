import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs-extra';
import {
	launchEyas,
	exitEyas,
	getUiView,
	getTestView,
	ensureEnvironmentSelected,
	emitIpcMessage
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

		// navigate the test layer to the recording fixture via the demo site's own header nav
		const homePage = await getTestView(electronApp, /eyas\.cycosoft\.com\/?$/);
		await homePage.locator(`.nav-links a`, { hasText: `Recording` }).click();

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
			s => s.type === `click` && s.selectors?.[0] === `aria/Frame button`
		);
		expect(frameClickStep).toBeTruthy();
		expect(Array.isArray(frameClickStep.frame)).toBe(true);
	});

	test(`continues recording without crashing after a click inside a cross-origin iframe`, async () => {
		test.setTimeout(30000);
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		const homePage = await getTestView(electronApp, /eyas\.cycosoft\.com\/?$/);
		await homePage.locator(`.nav-links a`, { hasText: `Recording` }).click();

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
			s => s.type === `click` && s.selectors?.[0] === `aria/Top-level button`
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

		const homePage = await getTestView(electronApp, /eyas\.cycosoft\.com\/?$/);
		await homePage.locator(`.nav-links a`, { hasText: `Recording` }).click();

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

	test(`captures and replays scroll + click actions inside a popup window, then auto-closes it, hitting the exact button the user clicked`, async () => {
		test.setTimeout(30000);
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		const homePage = await getTestView(electronApp, /eyas\.cycosoft\.com\/?$/);
		await homePage.locator(`.nav-links a`, { hasText: `Recording` }).click();

		const testPage = await getTestView(electronApp, /demo\/recording/);
		expect(testPage).toBeTruthy();

		await testPage.locator(`[data-testid="popup-link"]`).click();

		const popupPage = await getTestView(electronApp, /demo\/recording\/popup/);
		expect(popupPage).toBeTruthy();

		// clear any stale localStorage from a prior run in this same partition
		await popupPage.evaluate(() => localStorage.clear());

		// scroll to, then click, the button 2000px down — reproduces the scenario where a naive
		// (no-op) scroll replay would leave the page unscrolled and a coordinate-based click would
		// land on the wrong (top) button instead
		await popupPage.evaluate(() => window.scrollTo(0, 2000));
		await popupPage.locator(`[data-testid="popup-click-bottom"]`).click();
		await popupPage.waitForTimeout(2500);

		expect(await popupPage.evaluate(() => localStorage.getItem(`__lastClick`))).toBe(`popup-click-bottom`);

		await popupPage.close();

		// give the main process's `closed` handler time to append the closeWindow step
		await testPage.waitForTimeout(500);
		await uiPage.locator(`[data-qa="btn-recording-stop"]`).click();

		const session = await readLatestSession(electronApp);
		expect(session.status).toBe(`stopped`);

		const popupClickStep = session.recording.steps.find(
			s => s.type === `click` && s.selectors?.[0] === `aria/Bottom popup button`
		);
		expect(popupClickStep).toBeTruthy();
		expect(popupClickStep.popupId).toBeTruthy();

		const closeWindowStep = session.recording.steps.find(s => s.type === `closeWindow`);
		expect(closeWindowStep).toBeTruthy();
		expect(closeWindowStep.popupId).toBe(popupClickStep.popupId);

		await popupPage.evaluate(() => localStorage.clear()).catch(() => {});

		// with the default no-delay replay speed, the popup can open, get clicked, and auto-close
		// again before a polling-based lookup would ever observe it — listen for the 'window' event
		// directly instead of polling electronApp.windows() after the fact
		// the default no-delay replay speed opens, clicks, and auto-closes the popup faster than
		// this test's IPC/evaluate round-trips can observe it — switch to natural pacing (500ms
		// between steps) just for this replay so there's time to assert against the popup mid-flight
		await emitIpcMessage(electronApp, `save-setting`, { key: `recording.replaySpeed`, value: `natural`, projectId: null });

		const seenWindows = [];
		electronApp.on(`window`, page => seenWindows.push(page));

		await uiPage.locator(`[data-qa="btn-recording-replay"]`).click();

		await expect.poll(() => seenWindows.some(p => { try { return p.url().includes(`/demo/recording/popup`); } catch { return false; } }), { timeout: 10000 }).toBe(true);
		const replayedPopupPage = seenWindows.find(p => { try { return p.url().includes(`/demo/recording/popup`); } catch { return false; } });
		expect(replayedPopupPage).toBeTruthy();

		await expect.poll(async () => {
			try { return await replayedPopupPage.evaluate(() => localStorage.getItem(`__lastClick`)); }
			catch { return null; }
		}, { timeout: 10000 }).toBe(`popup-click-bottom`);

		// replay's recorded closeWindow step should close the popup automatically
		await expect.poll(() => replayedPopupPage.isClosed(), { timeout: 10000 }).toBe(true);
		await expect(uiPage.locator(`[data-qa="recording-playback-error"]`)).not.toBeVisible();
	});

	// reproduces a reported bug: clicking through several directory links on a real GitHub repo
	// page (a client-side/SPA-style navigator that updates the URL without a full page reload)
	// records fine, but replay only re-opens the popup at its *starting* URL and then closes it —
	// none of the intermediate directory clicks are followed. Contrast with npmjs.com below, which
	// is a traditional full-page-reload site and replays correctly.
	test(`replays chained directory-link clicks on a real GitHub repo page inside a popup, following each navigation`, async () => {
		test.setTimeout(60000);
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		const homePage = await getTestView(electronApp, /eyas\.cycosoft\.com\/?$/);
		expect(homePage).toBeTruthy();

		// the demo homepage's hero CTA links open real external sites in a new window
		await homePage.locator(`a[href="https://github.com/cycosoft/Eyas"]`).first().click();

		const githubPage = await getTestView(electronApp, /^https:\/\/github\.com\/cycosoft\/Eyas/);
		expect(githubPage).toBeTruthy();
		await githubPage.waitForLoadState(`domcontentloaded`);

		// click into a directory, then a subdirectory, then a file — each of these is a client-side
		// navigation on github.com that changes the URL without a full page reload
		await githubPage.locator(`a[href="/cycosoft/Eyas/tree/main/demo"]:visible`).first().click();
		await githubPage.waitForURL(/\/tree\/main\/demo$/);

		await githubPage.locator(`a[href="/cycosoft/Eyas/tree/main/demo/assets"]:visible`).first().click();
		await githubPage.waitForURL(/\/tree\/main\/demo\/assets$/);

		const recordedFinalUrl = githubPage.url();

		// recorder buffers steps and only flushes every FLUSH_INTERVAL_MS (2s) — must outlive that
		// before closing, or the buffered directory-click steps are lost with the destroyed webContents
		await githubPage.waitForTimeout(2500);
		await githubPage.close();

		await homePage.waitForTimeout(500);
		await uiPage.locator(`[data-qa="btn-recording-stop"]`).click();
		await expect(uiPage.locator(`[data-qa="btn-recording-replay"]`)).toBeVisible();

		const seenWindows = [];
		electronApp.on(`window`, page => seenWindows.push(page));

		await uiPage.locator(`[data-qa="btn-recording-replay"]`).click();

		await expect.poll(
			() => seenWindows.some(p => { try { return p.url().includes(`github.com/cycosoft/Eyas`); } catch { return false; } }),
			{ timeout: 15000 }
		).toBe(true);
		const replayedGithubPage = seenWindows.find(p => { try { return p.url().includes(`github.com/cycosoft/Eyas`); } catch { return false; } });
		expect(replayedGithubPage).toBeTruthy();

		// this is the assertion that captures the bug report: replay should follow the directory
		// clicks through to the same final URL that was recorded, not just open at the start URL
		// (or worse, get auto-closed by a stray closeWindow step before the clicks are dispatched)
		await expect.poll(async () => {
			try { return replayedGithubPage.url(); } catch { return null; }
		}, { timeout: 15000 }).toBe(recordedFinalUrl);

		await expect(uiPage.locator(`[data-qa="recording-playback-error"]`)).not.toBeVisible();
	});

	test(`replays a real npmjs.com navigation inside a popup as a full-page-reload control case`, async () => {
		test.setTimeout(60000);
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		const homePage = await getTestView(electronApp, /eyas\.cycosoft\.com\/?$/);
		expect(homePage).toBeTruthy();

		await homePage.locator(`a[href="https://www.npmjs.com/package/@cycosoft/eyas"]`).first().click();

		const npmPage = await getTestView(electronApp, /^https:\/\/www\.npmjs\.com\/package\/@cycosoft\/eyas/);
		expect(npmPage).toBeTruthy();
		await npmPage.waitForLoadState(`domcontentloaded`);

		const recordedFinalUrl = npmPage.url();

		await npmPage.waitForTimeout(500);
		await npmPage.close();

		await homePage.waitForTimeout(500);
		await uiPage.locator(`[data-qa="btn-recording-stop"]`).click();
		await expect(uiPage.locator(`[data-qa="btn-recording-replay"]`)).toBeVisible();

		const seenWindows = [];
		electronApp.on(`window`, page => seenWindows.push(page));

		await uiPage.locator(`[data-qa="btn-recording-replay"]`).click();

		await expect.poll(
			() => seenWindows.some(p => { try { return p.url().includes(`npmjs.com/package/@cycosoft/eyas`); } catch { return false; } }),
			{ timeout: 15000 }
		).toBe(true);
		const replayedNpmPage = seenWindows.find(p => { try { return p.url().includes(`npmjs.com/package/@cycosoft/eyas`); } catch { return false; } });
		expect(replayedNpmPage).toBeTruthy();

		await expect.poll(async () => {
			try { return replayedNpmPage.url(); } catch { return null; }
		}, { timeout: 15000 }).toBe(recordedFinalUrl);

		await expect(uiPage.locator(`[data-qa="recording-playback-error"]`)).not.toBeVisible();
	});

	// reproduces a reported bug: on npmjs.com's package README, clicking the "Eyas Desktop"
	// link (a same-tab, full-page-reload navigation to github.com) records fine, but replay
	// re-dispatches the click against the wrong element because the recorded selector is a
	// last-resort positional fallback (`#readme > :nth-child(N) > a`) computed against the
	// README's DOM structure at record time. That structure isn't guaranteed stable between
	// the recording load and the replay's fresh load of the same live, dynamic npm page — so
	// the click can land on a different link (or nothing) and replay silently fails to follow
	// the navigation to GitHub, with no thrown error (a click event still fires on *something*).
	test(`replays a click on npmjs.com's README link that navigates the popup to GitHub`, async () => {
		test.setTimeout(60000);
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		const homePage = await getTestView(electronApp, /eyas\.cycosoft\.com\/?$/);
		expect(homePage).toBeTruthy();

		await homePage.locator(`a[href="https://www.npmjs.com/package/@cycosoft/eyas"]`).first().click();

		const npmPage = await getTestView(electronApp, /^https:\/\/www\.npmjs\.com\/package\/@cycosoft\/eyas/);
		expect(npmPage).toBeTruthy();
		await npmPage.waitForLoadState(`domcontentloaded`);

		const readmeLink = npmPage.locator(`#readme a`, { hasText: `Eyas Desktop` }).first();
		await readmeLink.scrollIntoViewIfNeeded();
		await readmeLink.click();

		// this is a same-tab full-page navigation away from npmjs.com, to github.com
		await npmPage.waitForURL(/^https:\/\/github\.com/, { timeout: 15000 });
		const recordedFinalUrl = npmPage.url();

		// outlive the recorder's flush window before closing, though the click/change immediate-flush
		// fix means this click step should already be flushed by the time the navigation completed
		await npmPage.waitForTimeout(500);
		await npmPage.close();

		await homePage.waitForTimeout(500);
		await uiPage.locator(`[data-qa="btn-recording-stop"]`).click();
		await expect(uiPage.locator(`[data-qa="btn-recording-replay"]`)).toBeVisible();

		const session = await readLatestSession(electronApp);
		expect(session.status).toBe(`stopped`);

		// the click on the README link must have been captured at all — guards against the
		// separate (already-fixed) flush-timing bug regressing
		const readmeClickStep = session.recording.steps.find(s => s.type === `click` && s.popupId);
		expect(readmeClickStep).toBeTruthy();

		const seenWindows = [];
		electronApp.on(`window`, page => seenWindows.push(page));

		await uiPage.locator(`[data-qa="btn-recording-replay"]`).click();

		await expect.poll(
			() => seenWindows.some(p => { try { return p.url().includes(`npmjs.com/package/@cycosoft/eyas`); } catch { return false; } }),
			{ timeout: 15000 }
		).toBe(true);
		const replayedNpmPage = seenWindows.find(p => { try { return p.url().includes(`npmjs.com/package/@cycosoft/eyas`); } catch { return false; } });
		expect(replayedNpmPage).toBeTruthy();

		// this is the assertion that captures the bug report: replay should follow the README
		// link click through to GitHub, not silently fail to navigate at all
		await expect.poll(async () => {
			try { return replayedNpmPage.url(); } catch { return null; }
		}, { timeout: 15000 }).toBe(recordedFinalUrl);

		await expect(uiPage.locator(`[data-qa="recording-playback-error"]`)).not.toBeVisible();
	});
});
