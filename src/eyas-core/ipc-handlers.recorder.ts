import { ipcMain } from 'electron';
import type { CoreContext } from '@registry/eyas-core.js';
import type { RecorderFlushStepsPayload, RecorderReplayRequestPayload, RecorderGetSessionPayload, RecorderGetRunStepsPayload } from '@registry/ipc.js';
import type { ProjectId, SessionId } from '@registry/primitives.js';
import * as sessionRecorderService from './session-recorder.service.js';
import sessionPlaybackService from './session-playback.service.js';
import runHistoryService from './run-history.service.js';
import { getPopupIdForWebContents } from './window.popups.js';

// Initializes recorder-related IPC listeners.
export function initRecorderIpcListeners(ctx: CoreContext): void {
	ipcMain.on(`recorder-flush-steps`, (event, steps: RecorderFlushStepsPayload) => {
		// the renderer can't reliably self-report which popup it belongs to (a popup's injected
		// window.__eyasPopupId doesn't survive its first navigation), so tag steps here instead,
		// keyed off which webContents actually sent them — undefined for the main test layer
		const popupId = getPopupIdForWebContents(event.sender);
		const taggedSteps = popupId === undefined ? steps : steps.map(step => ({ ...step, popupId }));
		sessionRecorderService.appendSteps(ctx, taggedSteps);
	});

	ipcMain.on(`recorder-stop`, () => {
		sessionRecorderService.stopRecording(ctx);
	});

	ipcMain.on(`recorder-record-start`, () => {
		sessionRecorderService.startSession(ctx).catch(err => {
			console.error(`[IPC-HANDLERS-RECORDER] failed to start new recording:`, err);
		});
	});

	ipcMain.on(`recorder-replay-request`, (_event, payload: RecorderReplayRequestPayload) => {
		sessionPlaybackService.playSession(ctx, payload.sessionId as SessionId).catch(err => {
			console.error(`[IPC-HANDLERS-RECORDER] playback failed:`, err);
		});
	});

	ipcMain.on(`recorder-replay-stop`, () => {
		sessionPlaybackService.stopPlayback();
	});

	ipcMain.on(`recorder-list-sessions`, () => {
		sessionRecorderService.listSessions(ctx).then(sessions => {
			ctx.$eyasLayer?.webContents?.send(`recorder-sessions-listed`, sessions);
		}).catch(err => {
			console.error(`[IPC-HANDLERS-RECORDER] failed to list sessions:`, err);
		});
	});

	ipcMain.on(`recorder-get-session`, (_event, payload: RecorderGetSessionPayload) => {
		sessionRecorderService.getSession(ctx, payload.sessionId as SessionId).then(session => {
			ctx.$eyasLayer?.webContents?.send(`recorder-session-loaded`, session);
		}).catch(err => {
			console.error(`[IPC-HANDLERS-RECORDER] failed to load session:`, err);
		});
	});

	ipcMain.on(`recorder-get-run-steps`, (_event, payload: RecorderGetRunStepsPayload) => {
		const projectId = (ctx.$config?.meta.projectId || `default`) as ProjectId;
		const sessionId = payload.sessionId as SessionId;
		runHistoryService.getStepOutcomes(projectId, sessionId).then(result => {
			ctx.$eyasLayer?.webContents?.send(`recorder-run-steps-loaded`, result ? { sessionId, ...result } : null);
		}).catch(err => {
			console.error(`[IPC-HANDLERS-RECORDER] failed to load run steps:`, err);
		});
	});
}
