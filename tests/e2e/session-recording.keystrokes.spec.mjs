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
// Covers a rich-text editor's round trip through record and replay. A contenteditable root has no
// `.value` to splice, so none of the input/textarea machinery applies to it: text typed into one is
// recorded from the `input` event and replayed with CDP Input.insertText, and the editing keys that
// remain (Backspace, Enter, chords) fall through to a CDP key event — which types nothing unless
// `text` or a virtual key code rides along. The textarea and plain input here are the controls: they
// stay on the `.value`-splice path throughout.
//
// The second test's editor assertion is what guards all of that. It held only conditionally while
// replay also carried a self-healing corrector — the corrector repaired the editor on blur, so the
// assertion passed even with replay entirely broken, and a third test that never blurred the editor
// was needed to keep it honest. Replay now *checks* the editor instead of writing to it (see
// session-playback.assertions.ts), so nothing repairs the end state and the second test stands on
// its own again. The third test was retired with the corrector that made it necessary.

/**
 * Path of the most recently-written session recording file for this app run.
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @returns {Promise<string>}
 */
async function latestSessionPath(electronApp) {
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
	return sessionFile;
}

/**
 * Reads the most recently-written session recording file for this app run.
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @returns {Promise<object>}
 */
async function readLatestSession(electronApp) {
	return fs.readJson(await latestSessionPath(electronApp));
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

	test(`captures editor text from input events and textarea text from keystrokes`, async () => {
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

		// the editor's text comes from the browser's account of each edit, not from keystrokes —
		// which is what lets a paste or an autocorrect be recorded at all
		const editorInput = session.recording.steps.filter(s => s.type === `editableInput`);
		expect(editorInput.map(s => s.data).join(``)).toBe(`Hi`);

		// ...and the same characters are *not* also recorded as keystrokes, or replay would type twice
		const keyDowns = session.recording.steps.filter(s => s.type === `keyDown`);
		expect(keyDowns.filter(s => s.selectionStart === undefined && s.key.length === 1)).toHaveLength(0);

		// the textarea is the control: still keystrokes, still carrying the cursor position that keeps
		// it on the `.value`-splice path
		expect(keyDowns.filter(s => s.selectionStart !== undefined).map(s => s.key)).toEqual(expect.arrayContaining([`H`, `i`]));
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

		// the editor's round trip: text in via input-event capture, the Backspace via a CDP key event
		await expect.poll(() => textOf(`[data-testid="rich-text"]`), { timeout: 20000 }).toBe(`Rich text`);

		// the controls — these were already working via the `.value` splice and must stay that way
		await expect.poll(() => valueOf(`[data-testid="notes"]`), { timeout: 20000 }).toBe(`Notes`);
		await expect.poll(() => valueOf(`[data-testid="single-line"]`), { timeout: 20000 }).toBe(`Plain`);

		await expect(uiPage.locator(`[data-qa="recording-playback-error"]`)).not.toBeVisible();

		// nothing drifted, so replay found nothing to report — the same surface that would show a
		// mismatch is the proof there wasn't one
		await expect(uiPage.locator(`[data-qa="recording-playback-mismatches"]`)).not.toBeVisible();
	});

	test(`reports a mismatch to the user when the editor doesn't end up saying what was recorded`, async () => {
		test.setTimeout(45000);
		const { uiPage, testPage } = await openRecordingFixture(electronApp);

		const editor = testPage.locator(`[data-testid="rich-text"]`);
		await editor.click();

		// Text that arrives by means the recorder can't capture — no keystrokes, no input event. This
		// stands in for the real cases that still don't replay (IME, spellcheck correction, an editor
		// populating itself), each of which is hard to produce on demand but identical in effect: the
		// editor ends the recording holding text that no step will reproduce.
		await editor.evaluate(el => { el.textContent = `Rich text`; });

		// leaving the editor is what records the expectation replay checks against
		await testPage.locator(`[data-testid="notes"]`).click();

		await testPage.waitForTimeout(2500);
		await uiPage.locator(`[data-qa="btn-recording-stop"]`).click();
		await expect(uiPage.locator(`[data-qa="btn-recording-replay"]`)).toBeVisible();

		// self-verifying: if the recorder ever learns to capture this, the test would silently become a
		// no-drift case, so assert the expectation exists and that nothing replays it
		const session = await readLatestSession(electronApp);
		expect(session.recording.steps.filter(s => s.type === `editableChange`)).toHaveLength(1);
		expect(session.recording.steps.filter(s => s.type === `editableInput`)).toHaveLength(0);

		await uiPage.locator(`[data-qa="btn-recording-replay"]`).click();

		// the whole justification for checking rather than correcting: the tester is told
		const mismatches = uiPage.locator(`[data-qa="recording-playback-mismatches"]`);
		await expect(mismatches).toBeVisible({ timeout: 30000 });
		await expect(mismatches).toContainText(`1 mismatch`);

		// ...and can reach enough detail to act on, rather than just being told something was off. The
		// detail is a Vuetify tooltip, which renders into an overlay only once activated — so hovering
		// is the only way to prove it's actually reachable and not just present in the store.
		await mismatches.hover();
		await expect(uiPage.getByText(`expected "Rich text"`)).toBeVisible();

		// a mismatch is a finding, not a crash — the replay itself still completed
		await expect(uiPage.locator(`[data-qa="recording-playback-error"]`)).not.toBeVisible();
	});

	test(`replays text pasted into the editor, which no keystroke ever carried`, async () => {
		test.setTimeout(45000);
		const { uiPage, testPage } = await openRecordingFixture(electronApp);

		await electronApp.evaluate(({ clipboard }) => clipboard.writeText(`Pasted text`));

		const editor = testPage.locator(`[data-testid="rich-text"]`);
		await editor.click();
		await testPage.keyboard.press(process.platform === `darwin` ? `Meta+V` : `Control+V`);
		await expect(editor).toHaveText(`Pasted text`);

		await testPage.waitForTimeout(2500);
		await uiPage.locator(`[data-qa="btn-recording-stop"]`).click();

		// the content lives in the recording itself, not in whatever happens to be on the clipboard at
		// replay time — which is why a real Ctrl+V can't be what replays here
		const session = await readLatestSession(electronApp);
		const pasteStep = session.recording.steps.find(s => s.type === `editableInput` && s.inputType === `insertFromPaste`);
		expect(pasteStep?.data).toBe(`Pasted text`);

		await expect(uiPage.locator(`[data-qa="btn-recording-replay"]`)).toBeVisible();
		await uiPage.locator(`[data-qa="btn-recording-replay"]`).click();

		const textOf = async selector => {
			try { return await testPage.locator(selector).innerText(); }
			catch { return null; }
		};
		// before input-event capture this replayed as an empty editor: Ctrl+V recorded `Control` and
		// `v`, and the pasted content appeared in no step at all
		await expect.poll(() => textOf(`[data-testid="rich-text"]`), { timeout: 20000 }).toBe(`Pasted text`);
	});
});
