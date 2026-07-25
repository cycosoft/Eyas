import type { CoreContext } from '@registry/eyas-core.js';
import type { RecordingStep, ClickStep, ClickPoint } from '@registry/recording.js';
import type { RecorderPlaybackStatusPayload } from '@registry/ipc.js';
import type { SessionId, DurationMS, DomainUrl, PopupId, StepCount } from '@registry/primitives.js';
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

function _delay(ms: DurationMS): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// after forcing a navigation back to startUrl, wait for two real paint cycles before dispatching
// input — an arbitrary timer either races a slow page or wastes time on a fast one, whereas a
// double rAF is a genuine "the page has actually painted" signal from the renderer itself
function _waitForPaint(webContents: Electron.WebContents): Promise<void> {
	return webContents.executeJavaScript(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
}

// step.offsetX/offsetY are viewport-relative at record time — nothing guarantees the page is
// scrolled to that same position at replay time (e.g. a `navigate` step reloads at scrollY 0),
// so a raw coordinate replay can click whatever now happens to sit at that pixel. Resolving the
// captured SelectorGroup instead — scrolling the real target into view and clicking its actual
// center — makes replay robust to any scroll/layout drift between recording and playback.
async function _resolveClickPoint(target: Electron.WebContents, step: ClickStep): Promise<ClickPoint | null> {
	const selectors = [step.selectors.primary, ...step.selectors.fallbacks];
	const script = `(function(selectors){
		for (const sel of selectors) {
			let el;
			try { el = document.querySelector(sel); } catch { el = null; }
			if (el) {
				// pages may set CSS scroll-behavior: smooth — force an instant jump so the
				// bounding rect read immediately after reflects the post-scroll position
				el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
				const rect = el.getBoundingClientRect();
				return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
			}
		}
		return null;
	})(${JSON.stringify(selectors)})`;

	try {
		return await target.executeJavaScript(script);
	} catch {
		return null;
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

async function _dispatchClick(target: Electron.WebContents, step: ClickStep): Promise<void> {
	// prefer the captured selector (robust to scroll/layout drift); fall back to the raw
	// recorded coordinates only if none of the selectors resolve to an element
	const resolved = await _resolveClickPoint(target, step);
	const x = resolved?.x ?? step.offsetX;
	const y = resolved?.y ?? step.offsetY;
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
		await target.debugger.sendCommand(`Input.insertText`, { text: step.value });
		return;
	case `keyDown`:
		await target.debugger.sendCommand(`Input.dispatchKeyEvent`, { type: `keyDown`, key: step.key });
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
			if (stepDelayMs > 0) { await _delay(stepDelayMs); }
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
