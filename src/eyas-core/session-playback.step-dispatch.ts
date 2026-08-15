import type { RecordingStep, InputStep, KeyDownStep } from '@registry/recording.js';
import type { DurationMS, PopupId, StepIndex } from '@registry/primitives.js';
import { getPopupWebContents, closePopup } from './window.popups.js';
import { buildChangeScript, buildKeyDownMutationScript } from './session-playback.selector-resolution.js';
import { dispatchClick } from './session-playback.clicks.js';
import { editingPayload, keyEventPayload, trackModifier } from './session-playback.keystrokes.js';
import { checkEditableText } from './session-playback.assertions.js';

// after forcing a navigation back to startUrl, wait for two real paint cycles before dispatching
// input — an arbitrary timer either races a slow page or wastes time on a fast one, whereas a
// double rAF is a genuine "the page has actually painted" signal from the renderer itself
function _waitForPaint(webContents: Electron.WebContents): Promise<void> {
	return webContents.executeJavaScript(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
}

// a freshly-opened popup (or a page mid-navigation) may still be loading when its first step
// arrives — DOM queries/scroll against a not-yet-loaded document would silently no-op
async function _ensureTargetReady(target: Electron.WebContents, stepType: RecordingStep[`type`]): Promise<void> {
	const needsReadyDom = stepType === `click` || stepType === `scroll` || stepType === `change` || stepType === `editableChange`;
	if (needsReadyDom && target.isLoading()) {
		await new Promise<void>(resolve => target.once(`did-stop-loading`, () => resolve()));
		await _waitForPaint(target);
	}
}

// sets the field's value directly and dispatches input/change (rather than CDP Input.insertText,
// which inserts at the cursor and duplicates any pre-existing text instead of replacing it) —
// mirrors Playwright's fill()/Selenium's TYPE semantics. Note: bypasses React's patched value
// setter, so React-controlled inputs on the app under test may not pick this up; not a regression,
// as Input.insertText had the same limitation plus the duplication bug.
async function _dispatchChange(target: Electron.WebContents, step: InputStep): Promise<void> {
	// self-healing guard: only overwrite .value if per-keystroke replay didn't already produce the
	// recorded value (e.g. a masked/formatted field drifted) — otherwise just fire the `change`
	// event a real blur would have produced, without clobbering a value that's already correct
	await target.executeJavaScript(buildChangeScript(step.selectors, step.value));
}

// splices the keystroke into document.activeElement.value at the recorded cursor position rather
// than dispatching an inert CDP key event — gives replay real per-keystroke fidelity (masking,
// autocomplete, live validation) instead of only snapping to the final value on the `change` step
async function _dispatchKeyDown(target: Electron.WebContents, step: KeyDownStep): Promise<void> {
	const { selectionStart, selectionEnd } = step;
	const mutatesText = (step.key.length === 1 || step.key === `Backspace` || step.key === `Delete`)
		&& selectionStart !== undefined && selectionEnd !== undefined;

	if (mutatesText) {
		await target.executeJavaScript(buildKeyDownMutationScript(step.key, selectionStart, selectionEnd));
		return;
	}

	// functional keys (Enter, Tab, Escape, arrows, modifier combos, etc.), or keys with no
	// recorded cursor position — dispatch the real key event; these don't mutate .value directly
	await target.debugger.sendCommand(`Input.dispatchKeyEvent`, { type: `keyDown`, key: step.key, ...keyEventPayload(step), ...editingPayload(step) });
}

async function _dispatchStep(webContents: Electron.WebContents, step: RecordingStep, stepIndex: StepIndex): Promise<void> {
	trackModifier(step);

	if (step.type === `closeWindow`) {
		await closePopup(step.popupId);
		return;
	}

	const target = `popupId` in step && step.popupId !== undefined ? getPopupWebContents(step.popupId) : webContents;
	if (!target) {
		// the popup this step belongs to isn't tracked (e.g. it was closed manually out of order) — skip rather than throw
		console.warn(`[SESSION-PLAYBACK-SERVICE] skipping step targeting an untracked popup:`, step);
		return;
	}

	await _ensureTargetReady(target, step.type);

	switch (step.type) {
	case `click`:
		await dispatchClick(target, step);
		return;
	case `change`:
		await _dispatchChange(target, step);
		return;
	case `editableChange`:
		// checked, not written — see session-playback.assertions.ts for why replay reports a
		// rich-text editor's drift instead of quietly correcting it
		await checkEditableText(target, step, stepIndex);
		return;
	case `editableInput`:
		// Input.insertText inserts at the caret in the focused element, which is what a recorded
		// contenteditable edit means — unlike _dispatchChange, there's no whole value to replace.
		// One step per edit, so a pasted block arrives as a block rather than as fake keystrokes.
		await target.debugger.sendCommand(`Input.insertText`, { text: step.data });
		return;
	case `keyDown`:
		await _dispatchKeyDown(target, step);
		return;
	case `keyUp`:
		await target.debugger.sendCommand(`Input.dispatchKeyEvent`, { type: `keyUp`, key: step.key, ...keyEventPayload(step) });
		return;
	case `scroll`:
		// step.x/y is the absolute window.scrollX/scrollY captured at record time, not a viewport
		// pointer position — dispatching it as a zero-delta CDP mouseWheel event never actually
		// scrolls the page, so set the scroll position directly instead
		await target.executeJavaScript(`window.scrollTo(${step.x}, ${step.y})`);
		return;
	case `navigate`:
		// a click step immediately before this one may already have caused this exact navigation
		// (e.g. clicking a plain <a href>) — did-start-navigation records both the click and its own
		// resulting navigate step, so re-issuing loadURL to a URL we're already on would just be a
		// redundant reload/jump on replay
		if (target.getURL() === step.url) { return; }
		await target.loadURL(step.url);
		return;
	default:
		// forward-compatibility contract: unrecognized future step types are skipped, not fatal
		console.warn(`[SESSION-PLAYBACK-SERVICE] skipping unrecognized step:`, step);
	}
}

/** Returns each step's popupId in first-appearance order, deduped — the order popups must be re-assigned ids in during replay. */
function _orderedPopupIds(steps: RecordingStep[]): PopupId[] {
	const seen = new Set<PopupId>();
	const ordered: PopupId[] = [];
	for (const step of steps) {
		const popupId = `popupId` in step ? step.popupId : undefined;
		if (popupId !== undefined && !seen.has(popupId)) {
			seen.add(popupId);
			ordered.push(popupId);
		}
	}
	return ordered;
}

function _delay(ms: DurationMS): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export { _dispatchStep, _orderedPopupIds, _waitForPaint, _delay };
