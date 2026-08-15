import type { CoreContext } from '@registry/eyas-core.js';
import type { RecordingStep, EyasRecordingEnvelope } from '@registry/recording.js';
import type { SessionId, RunId, DurationMS, DomainUrl, StepCount, StepIndex, ChannelName } from '@registry/primitives.js';
import type { RecorderPlaybackStatusPayload } from '@registry/ipc.js';
import type { ReplaySpeedMode } from '@registry/settings.js';
import sessionRecorderService from './session-recorder.service.js';
import runHistoryService from './run-history.service.js';
import { closeAllPopups, setReplayPopupIdQueue, clearReplayPopupIdQueue, hideAllRecordingOverlays, showAllRecordingOverlays } from './window.popups.js';
import { resetModifiers } from './session-playback.keystrokes.js';
import { resetMismatches, mismatchPayload } from './session-playback.assertions.js';
import { sendPlaybackStatus, computeStepActions, reportStepProgress } from './session-playback.progress.js';
import { _dispatchStep, _orderedPopupIds, _waitForPaint, _delay } from './session-playback.step-dispatch.js';
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

// paced as typing rather than as distinct user actions. editableInput belongs here because it's what
// replaces the per-character keyDown inside a rich-text editor.
const KEYSTROKE_STEP_TYPES = new Set<RecordingStep[`type`]>([`keyDown`, `keyUp`, `editableInput`]);

// swallow teardown errors so a popup that fails/hangs to close can never suppress the status
// report it's meant to precede (a stranded popup is recoverable; a swallowed failure isn't)
async function _teardownPopups(): Promise<void> {
	try { await closeAllPopups(); } catch { /* best-effort teardown */ }
}

/**
 * The up-front warning for a session this build can't fully read, as a status-payload fragment.
 * Omitted when there's nothing to say, so an ordinary run's `playing` payload is unchanged.
 *
 * Replay still proceeds: the unknown step types are skipped (see _dispatchStep's default branch),
 * which for a 1.2.0 session on a 1.1.0 build means a rich-text editor replays empty. That's a
 * degraded run, but a degraded run the tester has been told about beats refusing to play at all.
 */
function _schemaWarningPayload(session: EyasRecordingEnvelope): Partial<RecorderPlaybackStatusPayload> {
	if (!sessionRecorderService.isUnknownSchema(session)) { return {}; }
	return { schemaWarning: `This recording was made by a newer version of Eyas (format ${session.eyasSchemaVersion}). Steps this version doesn't recognize will be skipped, so the replay may be incomplete.` };
}

type WasAborted = boolean;

type RunStepsArgs = {
	webContents: Electron.WebContents;
	session: EyasRecordingEnvelope;
	runId: RunId;
	ctx: CoreContext;
	stepActions: ReturnType<typeof computeStepActions>;
	stepDelayMs: DurationMS;
};

/** Dispatches every step in order, recording each one's start in the run's history first. Returns whether the run was aborted (stopPlayback()) partway through, so the caller can skip the "it finished" bookkeeping for both the run and its popups. */
async function _runSteps({ webContents, session, runId, ctx, stepActions, stepDelayMs }: RunStepsArgs): Promise<WasAborted> {
	const steps = session.recording.steps;
	for (let i = 0; i < steps.length; i++) {
		if (_abortRequested) { return true; }
		const delayMs = KEYSTROKE_STEP_TYPES.has(steps[i].type) ? KEYSTROKE_DELAY_MS : stepDelayMs;
		if (delayMs > 0) { await _delay(delayMs); }
		await runHistoryService.recordStepStart(session.projectId, runId, i as StepIndex);
		await _dispatchStep(webContents, steps[i], i);
		reportStepProgress(ctx, stepActions, i);
	}
	return false;
}

async function _dispatchAllSteps(ctx: CoreContext, webContents: Electron.WebContents, session: EyasRecordingEnvelope): Promise<void> {
	const steps = session.recording.steps;
	const startUrl: DomainUrl | null = session.startUrl;
	// a stopPlayback() call with no replay in progress must not bleed into this new one
	_abortRequested = false;
	resetModifiers();
	resetMismatches();
	try { webContents.debugger.attach(CDP_DEBUGGER_VERSION); } catch { /* already attached */ }

	// replayed input/navigation is real DOM/webContents activity, indistinguishable from the
	// user's own — suppress the recorder so a replay doesn't record itself into its own session
	sessionRecorderService.setReplaying(true);
	setReplayPopupIdQueue(_orderedPopupIds(steps));
	ctx.toggleEyasUI(true); showAllRecordingOverlays();
	const stepActions = computeStepActions(steps);
	sendPlaybackStatus(ctx, { status: `playing`, completedSteps: 0 as StepCount, totalSteps: stepActions.totalActions, ..._schemaWarningPayload(session) });
	// declared here (rather than inline where it's assigned) so both the try body and the catch
	// block below can report against the same run
	let runId: RunId | undefined;
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

		// started here, not before the startUrl/paint-wait above — those already have their own
		// synchronization surface in tests, and delaying this until it's actually needed (the loop
		// below) avoids adding an extra tick in front of it
		runId = await runHistoryService.startRun(session.projectId, session.sessionId);

		const aborted = await _runSteps({ webContents, session, runId, ctx, stepActions, stepDelayMs });
		// a user-initiated stop can land anywhere in the step list, same as a thrown step — tear down
		// any popups the recording never reached its closeWindow step for before reporting stopped
		if (aborted) { await _teardownPopups(); }
		// on a natural finish, hold briefly so the renderer actually paints the 100%-complete frame
		// before this "stopped" status resets/hides the progress ring — otherwise both status
		// updates land in the same tick and the ring's last visible frame is one step short of full
		if (!aborted) { await _delay(PLAYBACK_COMPLETE_HOLD_MS); }
		// a user-initiated stop leaves the run row without an outcome — same "never finished" state a
		// crash would leave, since the tester only cares that it didn't complete, not why
		if (!aborted && runId) { await runHistoryService.finishRun(session.projectId, runId, `passed`); }
		// a replay that finished can still have findings — assertions don't abort the run (see
		// session-playback.assertions.ts), so the end of it is the first chance to report them
		sendPlaybackStatus(ctx, { status: `stopped`, ...mismatchPayload() });
	} catch (err) {
		const error = err instanceof Error ? err.message : String(err);
		// a thrown step still fails the replay (no continue-on-error) — but tear down any popups the
		// aborted recording never reached its closeWindow step for, the same way a failed Playwright/
		// Cypress test still tears down its browser context, before reporting the failure
		await _teardownPopups();
		if (runId) { await runHistoryService.finishRun(session.projectId, runId, `failed`); }
		// findings gathered before the throw are still worth surfacing — the step that failed doesn't
		// invalidate the assertions that already ran
		sendPlaybackStatus(ctx, { status: `failed`, error, ...mismatchPayload() });
	} finally {
		_abortRequested = false;
		sessionRecorderService.setReplaying(false);
		clearReplayPopupIdQueue();
		// let TestRunningRing.vue's fade-out transition finish before the UI layer collapses out from
		// under it, or the ring gets clipped mid-fade instead of animating away. Not awaited: playback
		// has already finished and reported its final status by this point, so the collapse shouldn't
		// hold up playSession()'s own caller
		// Collapsing is left to the renderer rather than forced here with toggleEyasUI(false, true):
		// that call unconditionally broadcasts close-modals, which would yank the session panel shut
		// even when the tester left it open to review the run that just finished.
		setTimeout(() => {
			ctx.$eyasLayer?.webContents?.send(`recorder-replay-finished` as ChannelName);
			hideAllRecordingOverlays();
		}, TEST_RUNNING_RING_FADE_MS);
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

	await _dispatchAllSteps(ctx, webContents, session);
}

export default { playSession, stopPlayback };
