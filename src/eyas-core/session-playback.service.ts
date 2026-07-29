import type { CoreContext } from '@registry/eyas-core.js';
import type { RecordingStep, ClickStep, ClickPoint, InputStep, KeyDownStep } from '@registry/recording.js';
import type { RecorderPlaybackStatusPayload } from '@registry/ipc.js';
import type { SessionId, DurationMS, DomainUrl, PopupId, StepCount, SelectorString, JsSnippet } from '@registry/primitives.js';
import type { ReplaySpeedMode } from '@registry/settings.js';
import sessionRecorderService from './session-recorder.service.js';
import { getPopupWebContents, closePopup, setReplayPopupIdQueue, clearReplayPopupIdQueue } from './window.popups.js';

const CDP_DEBUGGER_VERSION = `1.3`;

let _abortRequested = false;

/** Requests that the in-progress replay (if any) stop before dispatching its next step. */
function stopPlayback(): void {
	_abortRequested = true;
}

const REPLAY_STEP_DELAY_MS: Record<ReplaySpeedMode, DurationMS> = {
	'no-delay': 0 as DurationMS,
	natural: 500 as DurationMS
};

// ~240 WPM fast-typist pace (5 chars/word, 20 chars/sec) — fast enough to feel snappy and avoid
// bursting keystrokes at the page faster than a debounced validator/formatter can keep up, but
// not gated by the natural inter-action delay meant for pacing distinct user actions
const KEYSTROKE_DELAY_MS = 50 as DurationMS;

function _delay(ms: DurationMS): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// after forcing a navigation back to startUrl, wait for two real paint cycles before dispatching
// input — an arbitrary timer either races a slow page or wastes time on a fast one, whereas a
// double rAF is a genuine "the page has actually painted" signal from the renderer itself
function _waitForPaint(webContents: Electron.WebContents): Promise<void> {
	return webContents.executeJavaScript(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
}

const CLICK_TARGET_POLL_TIMEOUT_MS = 5000 as DurationMS;
const CLICK_TARGET_POLL_INTERVAL_MS = 100 as DurationMS;

// step.offsetX/offsetY are viewport-relative at record time and can drift from replay-time layout,
// so we resolve the recorded selector to its actual on-page position instead. Some pages (e.g.
// GitHub's file browser) render duplicate matches for responsive breakpoints — walk all matches
// and take the first one that's actually visible rather than trusting DOM order.
function _querySelectorScript(selector: SelectorString): JsSnippet {
	return `(function(sel){
		function isVisible(el) {
			if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') { return false; }
			const rect = el.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		}
		let els;
		try { els = document.querySelectorAll(sel); } catch { els = []; }
		for (const el of els) {
			// pages may set CSS scroll-behavior: smooth — force an instant jump so the
			// bounding rect read immediately after reflects the post-scroll position
			el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
			if (!isVisible(el)) { continue; }
			const rect = el.getBoundingClientRect();
			return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
		}
		return null;
	})(${JSON.stringify(selector)})`;
}

// SPA-style navigations (e.g. GitHub's client-side directory browser) never trip
// isLoading()/did-stop-loading, so poll the primary selector (the strongest identity signal —
// data-testid/data-qa/aria-label/id) until it appears or the timeout is spent. The class-list/
// positional fallbacks are deliberately NOT tried on a timeout: they're generic enough to
// coincidentally match an unrelated element on a still-stale, not-yet-navigated page, turning a
// real timeout into a confusing wrong click instead of a clear, surfaced failure.
async function _resolveClickPoint(target: Electron.WebContents, step: ClickStep): Promise<ClickPoint | null> {
	const primaryScript = _querySelectorScript(step.selectors.primary);
	const deadline = Date.now() + CLICK_TARGET_POLL_TIMEOUT_MS;
	for (;;) {
		try {
			const point = await target.executeJavaScript(primaryScript);
			if (point) { return point; }
		} catch {
			return null;
		}
		if (Date.now() >= deadline) { return null; }
		await _delay(CLICK_TARGET_POLL_INTERVAL_MS);
	}
}

// a freshly-opened popup (or a page mid-navigation) may still be loading when its first step
// arrives — DOM queries/scroll against a not-yet-loaded document would silently no-op
async function _ensureTargetReady(target: Electron.WebContents, stepType: RecordingStep[`type`]): Promise<void> {
	const needsReadyDom = stepType === `click` || stepType === `scroll` || stepType === `change`;
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
	const selectors = [step.selectors.primary, ...step.selectors.fallbacks];
	// self-healing guard: only overwrite .value if per-keystroke replay didn't already produce the
	// recorded value (e.g. a masked/formatted field drifted) — otherwise just fire the `change`
	// event a real blur would have produced, without clobbering a value that's already correct
	const script = `(function(selectors, value){
		for (const sel of selectors) {
			let el;
			try { el = document.querySelector(sel); } catch { el = null; }
			if (el) {
				if (el.value !== value) {
					el.value = value;
					el.dispatchEvent(new Event('input', { bubbles: true }));
				}
				el.dispatchEvent(new Event('change', { bubbles: true }));
				return;
			}
		}
	})(${JSON.stringify(selectors)}, ${JSON.stringify(step.value)})`;
	await target.executeJavaScript(script);
}

// splices the keystroke into document.activeElement.value at the recorded cursor position rather
// than dispatching an inert CDP key event — gives replay real per-keystroke fidelity (masking,
// autocomplete, live validation) instead of only snapping to the final value on the `change` step
async function _dispatchKeyDown(target: Electron.WebContents, step: KeyDownStep): Promise<void> {
	const mutatesText = (step.key.length === 1 || step.key === `Backspace` || step.key === `Delete`)
		&& step.selectionStart !== undefined && step.selectionEnd !== undefined;

	if (mutatesText) {
		const script = `(function(key, start, end){
			const el = document.activeElement;
			if (!el || typeof el.value !== 'string') { return; }
			const value = el.value;
			let newValue, newPos;
			if (key === 'Backspace') {
				newValue = start === end ? value.slice(0, Math.max(0, start - 1)) + value.slice(end) : value.slice(0, start) + value.slice(end);
				newPos = start === end ? Math.max(0, start - 1) : start;
			} else if (key === 'Delete') {
				newValue = start === end ? value.slice(0, start) + value.slice(end + 1) : value.slice(0, start) + value.slice(end);
				newPos = start;
			} else {
				newValue = value.slice(0, start) + key + value.slice(end);
				newPos = start + key.length;
			}
			el.value = newValue;
			try { el.setSelectionRange(newPos, newPos); } catch {}
			el.dispatchEvent(new Event('input', { bubbles: true }));
		})(${JSON.stringify(step.key)}, ${step.selectionStart}, ${step.selectionEnd})`;
		await target.executeJavaScript(script);
		return;
	}

	// functional keys (Enter, Tab, Escape, arrows, modifier combos, etc.), or keys with no
	// recorded cursor position — dispatch the real key event; these don't mutate .value directly
	await target.debugger.sendCommand(`Input.dispatchKeyEvent`, { type: `keyDown`, key: step.key });
}

// no coordinate fallback: replaying raw recorded offsetX/offsetY against a page that hasn't
// necessarily scrolled/laid out the same way as it did at record time is a silent-wrong-click risk
// (see the SelectorGroup poll above) — if the target genuinely never resolves, fail the step loudly
// rather than click whatever now happens to sit at that pixel
async function _dispatchClick(target: Electron.WebContents, step: ClickStep): Promise<void> {
	const resolved = await _resolveClickPoint(target, step);
	if (!resolved) {
		throw new Error(`Could not locate click target "${step.selectors.primary}" on the page.`);
	}
	const { x, y } = resolved;
	await target.debugger.sendCommand(`Input.dispatchMouseEvent`, { type: `mousePressed`, x, y, button: `left`, clickCount: 1 });
	await target.debugger.sendCommand(`Input.dispatchMouseEvent`, { type: `mouseReleased`, x, y, button: `left`, clickCount: 1 });
}

async function _dispatchStep(webContents: Electron.WebContents, step: RecordingStep): Promise<void> {
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
		await _dispatchClick(target, step);
		return;
	case `change`:
		await _dispatchChange(target, step);
		return;
	case `keyDown`:
		await _dispatchKeyDown(target, step);
		return;
	case `keyUp`:
		await target.debugger.sendCommand(`Input.dispatchKeyEvent`, { type: `keyUp`, key: step.key });
		return;
	case `scroll`:
		// step.x/y is the absolute window.scrollX/scrollY captured at record time, not a viewport
		// pointer position — dispatching it as a zero-delta CDP mouseWheel event never actually
		// scrolls the page, so set the scroll position directly instead
		await target.executeJavaScript(`window.scrollTo(${step.x}, ${step.y})`);
		return;
	case `navigate`:
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

function _sendPlaybackStatus(ctx: CoreContext, payload: RecorderPlaybackStatusPayload): void {
	ctx.$eyasLayer?.webContents?.send(`recorder-playback-status`, payload);
}

async function _dispatchAllSteps(ctx: CoreContext, webContents: Electron.WebContents, steps: RecordingStep[], startUrl: DomainUrl | null): Promise<void> {
	// a stopPlayback() call with no replay in progress must not bleed into this new one
	_abortRequested = false;
	try { webContents.debugger.attach(CDP_DEBUGGER_VERSION); } catch { /* already attached */ }

	// replayed input/navigation is real DOM/webContents activity, indistinguishable from the
	// user's own — suppress the recorder so a replay doesn't record itself into its own session
	sessionRecorderService.setReplaying(true);
	setReplayPopupIdQueue(_orderedPopupIds(steps));
	ctx.toggleEyasUI(true);
	_sendPlaybackStatus(ctx, { status: `playing`, completedSteps: 0 as StepCount, totalSteps: steps.length as StepCount });
	try {
		// the session's steps only capture navigations that occurred *during* recording — if
		// playback starts from a different view than recording did, replay the starting view first
		if (startUrl && webContents.getURL() !== startUrl) {
			await webContents.loadURL(startUrl);
			await _waitForPaint(webContents);
		}

		// the `recording.replaySpeed` app setting is intentionally ignored here (and its control is
		// hidden in SettingsModal.vue) — every replay today is a single-test run, so we always use
		// the natural-delay timing regardless of what's persisted in settings. The plan is to key
		// this off single-test vs. suite-run once a suite runner exists (see TODO.md), at which point
		// this should read `no-delay` for suite runs instead of a hardcoded value.
		const replaySpeed: ReplaySpeedMode = `natural`;
		const stepDelayMs = REPLAY_STEP_DELAY_MS[replaySpeed] ?? 0;

		for (let i = 0; i < steps.length; i++) {
			if (_abortRequested) { break; }
			const isKeystroke = steps[i].type === `keyDown` || steps[i].type === `keyUp`;
			const delayMs = isKeystroke ? KEYSTROKE_DELAY_MS : stepDelayMs;
			if (delayMs > 0) { await _delay(delayMs); }
			await _dispatchStep(webContents, steps[i]);
			_sendPlaybackStatus(ctx, { status: `playing`, completedSteps: (i + 1) as StepCount, totalSteps: steps.length as StepCount });
		}
		_sendPlaybackStatus(ctx, { status: `stopped` });
	} catch (err) {
		const error = err instanceof Error ? err.message : String(err);
		_sendPlaybackStatus(ctx, { status: `failed`, error });
	} finally {
		_abortRequested = false;
		sessionRecorderService.setReplaying(false);
		clearReplayPopupIdQueue();
		ctx.toggleEyasUI(false, true);
		try { webContents.debugger.detach(); } catch { /* not attached */ }
	}
}

/** Loads a stopped session and dispatches its steps into the test layer via the CDP debugger. */
async function playSession(ctx: CoreContext, sessionId: SessionId): Promise<void> {
	const webContents = ctx.$testLayer?.webContents;
	if (!webContents) { return; }

	const session = await sessionRecorderService.getSession(ctx, sessionId);
	if (!session) {
		_sendPlaybackStatus(ctx, { status: `failed`, error: `Session ${sessionId} was not found.` });
		return;
	}

	await _dispatchAllSteps(ctx, webContents, session.recording.steps, session.startUrl);
}

export default { playSession, stopPlayback };
