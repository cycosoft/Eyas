import type { CoreContext } from '@registry/eyas-core.js';
import type { RecordingStep } from '@registry/recording.js';
import type { RecorderPlaybackStatusPayload } from '@registry/ipc.js';
import type { ProjectId, SessionId, DurationMS, DomainUrl } from '@registry/primitives.js';
import type { ReplaySpeedMode } from '@registry/settings.js';
import sessionRecorderService from './session-recorder.service.js';
import settingsService from './settings-service.js';

const CDP_DEBUGGER_VERSION = `1.3`;

const REPLAY_STEP_DELAY_MS: Record<ReplaySpeedMode, DurationMS> = {
	'no-delay': 0 as DurationMS,
	natural: 500 as DurationMS
};

function _delay(ms: DurationMS): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function _dispatchStep(webContents: Electron.WebContents, step: RecordingStep): Promise<void> {
	switch (step.type) {
	case `click`:
		await webContents.debugger.sendCommand(`Input.dispatchMouseEvent`, { type: `mousePressed`, x: step.offsetX, y: step.offsetY, button: `left`, clickCount: 1 });
		await webContents.debugger.sendCommand(`Input.dispatchMouseEvent`, { type: `mouseReleased`, x: step.offsetX, y: step.offsetY, button: `left`, clickCount: 1 });
		return;
	case `change`:
		await webContents.debugger.sendCommand(`Input.insertText`, { text: step.value });
		return;
	case `keyDown`:
		await webContents.debugger.sendCommand(`Input.dispatchKeyEvent`, { type: `keyDown`, key: step.key });
		return;
	case `keyUp`:
		await webContents.debugger.sendCommand(`Input.dispatchKeyEvent`, { type: `keyUp`, key: step.key });
		return;
	case `scroll`:
		await webContents.debugger.sendCommand(`Input.dispatchMouseEvent`, { type: `mouseWheel`, x: step.x, y: step.y, deltaX: 0, deltaY: 0 });
		return;
	case `navigate`:
		await webContents.loadURL(step.url);
		return;
	default:
		// forward-compatibility contract: unrecognized future step types are skipped, not fatal
		console.warn(`[SESSION-PLAYBACK-SERVICE] skipping unrecognized step:`, step);
	}
}

function _sendPlaybackStatus(ctx: CoreContext, payload: RecorderPlaybackStatusPayload): void {
	ctx.$eyasLayer?.webContents?.send(`recorder-playback-status`, payload);
}

async function _dispatchAllSteps(ctx: CoreContext, webContents: Electron.WebContents, steps: RecordingStep[], startUrl: DomainUrl | null): Promise<void> {
	try { webContents.debugger.attach(CDP_DEBUGGER_VERSION); } catch { /* already attached */ }
	_sendPlaybackStatus(ctx, { status: `playing` });

	// replayed input/navigation is real DOM/webContents activity, indistinguishable from the
	// user's own — suppress the recorder so a replay doesn't record itself into its own session
	sessionRecorderService.setReplaying(true);
	try {
		// the session's steps only capture navigations that occurred *during* recording — if
		// playback starts from a different view than recording did, replay the starting view first
		if (startUrl && webContents.getURL() !== startUrl) {
			await webContents.loadURL(startUrl);
		}

		const projectId = ctx.$config?.meta.projectId as ProjectId | undefined;
		const replaySpeed = settingsService.get(`recording.replaySpeed`, projectId) as ReplaySpeedMode;
		const stepDelayMs = REPLAY_STEP_DELAY_MS[replaySpeed] ?? 0;

		for (let i = 0; i < steps.length; i++) {
			if (i > 0 && stepDelayMs > 0) { await _delay(stepDelayMs); }
			await _dispatchStep(webContents, steps[i]);
		}
		_sendPlaybackStatus(ctx, { status: `stopped` });
	} catch (err) {
		const error = err instanceof Error ? err.message : String(err);
		_sendPlaybackStatus(ctx, { status: `failed`, error });
	} finally {
		sessionRecorderService.setReplaying(false);
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

export default { playSession };
