import { defineStore } from 'pinia';
import type { RecordingState } from '@/types/recording.js';
import type { IsActive, ProgressRatio } from '@registry/primitives.js';
import type { RecorderStatusPayload } from '@registry/recording.js';
import type { RecorderPlaybackStatusPayload } from '@registry/ipc.js';

export default defineStore(`recording`, {
	state: (): RecordingState => ({
		completedSteps: 0,
		playbackError: null,
		playbackStatus: null,
		sessionId: null,
		status: null,
		totalSteps: 0
	}),

	getters: {
		isRecording: (state): IsActive => state.status === `recording`,
		isStopped: (state): IsActive => state.status === `stopped`,
		isPlaying: (state): IsActive => state.playbackStatus === `playing`,
		playbackProgress: (state): ProgressRatio => state.totalSteps > 0 ? state.completedSteps / state.totalSteps : 0
	},

	actions: {
		setFromIpc(payload: RecorderStatusPayload): void {
			this.status = payload.isRecording ? `recording` : `stopped`;
			this.sessionId = payload.sessionId;
			if (payload.isRecording) {
				this.playbackStatus = null;
				this.playbackError = null;
				this.completedSteps = 0;
				this.totalSteps = 0;
			}
		},

		setPlaybackStatus(payload: RecorderPlaybackStatusPayload): void {
			this.playbackStatus = payload.status;
			this.playbackError = payload.status === `failed` ? (payload.error ?? `Playback failed.`) : null;
			this.completedSteps = payload.completedSteps ?? this.completedSteps;
			this.totalSteps = payload.totalSteps ?? this.totalSteps;
			if (payload.status !== `playing`) {
				this.completedSteps = 0;
				this.totalSteps = 0;
			}
		}
	}
});
