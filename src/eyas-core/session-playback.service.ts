import type { CoreContext } from '@registry/eyas-core.js';
import type { RecordingStep, ClickStep, ClickPoint, InputStep, KeyDownStep } from '@registry/recording.js';
import type { SessionId, DurationMS, DomainUrl, PopupId, StepCount } from '@registry/primitives.js';
import type { ReplaySpeedMode } from '@registry/settings.js';
import sessionRecorderService from './session-recorder.service.js';
import { getPopupWebContents, closePopup, closeAllPopups, setReplayPopupIdQueue, clearReplayPopupIdQueue, hideAllRecordingOverlays, showAllRecordingOverlays } from './window.popups.js';
import { buildClickPointScript, buildChangeScript, buildKeyDownMutationScript } from './session-playback.selector-resolution.js';
import { sendPlaybackStatus, computeStepActions, reportStepProgress } from './session-playback.progress.js';
import { TEST_RUNNING_RING_FADE_MS, PLAYBACK_COMPLETE_HOLD_MS } from '@scripts/constants.js';

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

// SPA-style navigations (e.g. GitHub's client-side directory browser) never trip
// isLoading()/did-stop-loading, so poll the full candidate list — aria/text/testid/CSS, in
// priority order, matching the auto-wait model of real e2e frameworks — until one resolves or the
// timeout is spent, retrying the whole candidate list on each poll so a page still mid-navigation
// gets another chance rather than failing on the first miss. A client-side re-render can pass
// through a transient frame where a stale/duplicate element still matches — require the same point
// on two consecutive polls before accepting it, so a one-off transient match is discarded.
async function _resolveClickPoint(target: Electron.WebContents, step: ClickStep): Promise<ClickPoint | null> {
	const script = buildClickPointScript(step.selectors);
	const deadline = Date.now() + CLICK_TARGET_POLL_TIMEOUT_MS;
	let lastPoint: ClickPoint | null = null;
	for (;;) {
		let point: ClickPoint | null;
		try {
			point = await target.executeJavaScript(script);
		} catch {
			return null;
		}
		if (point && lastPoint && point.x === lastPoint.x && point.y === lastPoint.y) { return point; }
		lastPoint = point;
		// deadline reached without two consecutive matches: fall back to the last point seen rather
		// than failing outright — a page whose target keeps drifting (image load reflowing content,
		// sticky header settling) still gets its most recent resolution, matching the old undebounced
		// behavior as a floor; genuinely never-resolved (lastPoint still null) still fails the step
		if (Date.now() >= deadline) { return lastPoint; }
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
	await target.debugger.sendCommand(`Input.dispatchKeyEvent`, { type: `keyDown`, key: step.key });
}

// no coordinate fallback: replaying raw recorded offsetX/offsetY against a page that hasn't
// necessarily scrolled/laid out the same way as it did at record time is a silent-wrong-click risk
// (see the SelectorGroup poll above) — if the target genuinely never resolves, fail the step loudly
// rather than click whatever now happens to sit at that pixel
async function _dispatchClick(target: Electron.WebContents, step: ClickStep): Promise<void> {
	const resolved = await _resolveClickPoint(target, step);
	if (!resolved) {
		throw new Error(`Could not locate click target "${step.selectors[0]}" on the page.`);
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

// swallow teardown errors so a popup that fails/hangs to close can never suppress the status
// report it's meant to precede (a stranded popup is recoverable; a swallowed failure isn't)
async function _teardownPopups(): Promise<void> {
	try { await closeAllPopups(); } catch { /* best-effort teardown */ }
}

async function _dispatchAllSteps(ctx: CoreContext, webContents: Electron.WebContents, steps: RecordingStep[], startUrl: DomainUrl | null): Promise<void> {
	// a stopPlayback() call with no replay in progress must not bleed into this new one
	_abortRequested = false;
	try { webContents.debugger.attach(CDP_DEBUGGER_VERSION); } catch { /* already attached */ }

	// replayed input/navigation is real DOM/webContents activity, indistinguishable from the
	// user's own — suppress the recorder so a replay doesn't record itself into its own session
	sessionRecorderService.setReplaying(true);
	setReplayPopupIdQueue(_orderedPopupIds(steps));
	ctx.toggleEyasUI(true); showAllRecordingOverlays();
	const stepActions = computeStepActions(steps);
	sendPlaybackStatus(ctx, { status: `playing`, completedSteps: 0 as StepCount, totalSteps: stepActions.totalActions });
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

		let aborted = false;
		for (let i = 0; i < steps.length; i++) {
			if (_abortRequested) { aborted = true; break; }
			const isKeystroke = steps[i].type === `keyDown` || steps[i].type === `keyUp`;
			const delayMs = isKeystroke ? KEYSTROKE_DELAY_MS : stepDelayMs;
			if (delayMs > 0) { await _delay(delayMs); }
			await _dispatchStep(webContents, steps[i]);
			reportStepProgress(ctx, stepActions, i);
		}
		// a user-initiated stop can land anywhere in the step list, same as a thrown step — tear down
		// any popups the recording never reached its closeWindow step for before reporting stopped
		if (aborted) { await _teardownPopups(); }
		// on a natural finish, hold briefly so the renderer actually paints the 100%-complete frame
		// before this "stopped" status resets/hides the progress ring — otherwise both status
		// updates land in the same tick and the ring's last visible frame is one step short of full
		if (!aborted) { await _delay(PLAYBACK_COMPLETE_HOLD_MS); }
		sendPlaybackStatus(ctx, { status: `stopped` });
	} catch (err) {
		const error = err instanceof Error ? err.message : String(err);
		// a thrown step still fails the replay (no continue-on-error) — but tear down any popups the
		// aborted recording never reached its closeWindow step for, the same way a failed Playwright/
		// Cypress test still tears down its browser context, before reporting the failure
		await _teardownPopups();
		sendPlaybackStatus(ctx, { status: `failed`, error });
	} finally {
		_abortRequested = false;
		sessionRecorderService.setReplaying(false);
		clearReplayPopupIdQueue();
		// let TestRunningRing.vue's fade-out transition finish before the UI layer collapses out from
		// under it, or the ring gets clipped mid-fade instead of animating away. Not awaited: playback
		// has already finished and reported its final status by this point, so the collapse shouldn't
		// hold up playSession()'s own caller
		setTimeout(() => { ctx.toggleEyasUI(false, true); hideAllRecordingOverlays(); }, TEST_RUNNING_RING_FADE_MS);
		try { webContents.debugger.detach(); } catch { /* not attached */ }
	}
}

/** Loads a stopped session and dispatches its steps into the test layer via the CDP debugger. */
async function playSession(ctx: CoreContext, sessionId: SessionId): Promise<void> {
	const webContents = ctx.$testLayer?.webContents;
	if (!webContents) { return; }

	const session = await sessionRecorderService.getSession(ctx, sessionId);
	if (!session) {
		sendPlaybackStatus(ctx, { status: `failed`, error: `Session ${sessionId} was not found.` });
		return;
	}

	await _dispatchAllSteps(ctx, webContents, session.recording.steps, session.startUrl);
}

export default { playSession, stopPlayback };
