import { defineStore } from 'pinia';
import type { RecordingState } from '@/types/recording.js';
import type { IsActive } from '@registry/primitives.js';
import type { RecorderStatusPayload } from '@registry/recording.js';
import type { RecorderPlaybackStatusPayload } from '@registry/ipc.js';

export default defineStore(`recording`, {
	state: (): RecordingState => ({
		status: null,
		sessionId: null,
		playbackError: null
	}),

	getters: {
		isRecording: (state): IsActive => state.status === `recording`,
		isStopped: (state): IsActive => state.status === `stopped`
	},

	actions: {
		setFromIpc(payload: RecorderStatusPayload): void {
			this.status = payload.isRecording ? `recording` : `stopped`;
			this.sessionId = payload.sessionId;
		},

		setPlaybackStatus(payload: RecorderPlaybackStatusPayload): void {
			this.playbackError = payload.status === `failed` ? (payload.error ?? `Playback failed.`) : null;
		}
	}
});
