import { ipcMain } from 'electron';
import type { CoreContext } from '@registry/eyas-core.js';
import type { RecorderFlushStepsPayload, RecorderReplayRequestPayload } from '@registry/ipc.js';
import type { SessionId } from '@registry/primitives.js';
import * as sessionRecorderService from './session-recorder.service.js';
import sessionPlaybackService from './session-playback.service.js';

// Initializes recorder-related IPC listeners.
export function initRecorderIpcListeners(ctx: CoreContext): void {
	ipcMain.on(`recorder-flush-steps`, (_event, steps: RecorderFlushStepsPayload) => {
		sessionRecorderService.appendSteps(steps);
	});

	ipcMain.on(`recorder-stop`, () => {
		sessionRecorderService.stopRecording(ctx);
	});

	ipcMain.on(`recorder-replay-request`, (_event, payload: RecorderReplayRequestPayload) => {
		sessionPlaybackService.playSession(ctx, payload.sessionId as SessionId).catch(err => {
			console.error(`[IPC-HANDLERS-RECORDER] playback failed:`, err);
		});
	});
}
