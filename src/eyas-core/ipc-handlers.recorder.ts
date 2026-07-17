import { ipcMain } from 'electron';
import type { CoreContext } from '@registry/eyas-core.js';
import type { RecorderFlushStepsPayload, RecorderReplayRequestPayload } from '@registry/ipc.js';
import * as sessionRecorderService from './session-recorder.service.js';

// Initializes recorder-related IPC listeners.
export function initRecorderIpcListeners(ctx: CoreContext): void {
	ipcMain.on(`recorder-flush-steps`, (_event, steps: RecorderFlushStepsPayload) => {
		sessionRecorderService.appendSteps(steps);
	});

	ipcMain.on(`recorder-stop`, () => {
		sessionRecorderService.stopRecording(ctx);
	});

	ipcMain.on(`recorder-replay-request`, (_event, _payload: RecorderReplayRequestPayload) => {
		// Playback dispatch is scoped to a subsequent iteration of this deliverable.
	});
}
