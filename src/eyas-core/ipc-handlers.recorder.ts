import { ipcMain } from 'electron';
import type { CoreContext } from '@registry/eyas-core.js';
import type { RecorderFlushStepsPayload, RecorderReplayRequestPayload } from '@registry/ipc.js';
import type { SessionId } from '@registry/primitives.js';
import * as sessionRecorderService from './session-recorder.service.js';
import sessionPlaybackService from './session-playback.service.js';
import { getPopupIdForWebContents } from './window.popups.js';

// Initializes recorder-related IPC listeners.
export function initRecorderIpcListeners(ctx: CoreContext): void {
	ipcMain.on(`recorder-flush-steps`, (event, steps: RecorderFlushStepsPayload) => {
		// the renderer can't reliably self-report which popup it belongs to (a popup's injected
		// window.__eyasPopupId doesn't survive its first navigation), so tag steps here instead,
		// keyed off which webContents actually sent them — undefined for the main test layer
		const popupId = getPopupIdForWebContents(event.sender);
		const taggedSteps = popupId === undefined ? steps : steps.map(step => ({ ...step, popupId }));
		sessionRecorderService.appendSteps(taggedSteps);
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
