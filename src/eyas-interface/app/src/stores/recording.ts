import { defineStore } from 'pinia';
import type { RecordingState } from '@/types/recording.js';
import type { IsActive } from '@registry/primitives.js';
import type { RecorderStatusPayload } from '@registry/recording.js';

export default defineStore(`recording`, {
	state: (): RecordingState => ({
		status: null,
		sessionId: null
	}),

	getters: {
		isRecording: (state): IsActive => state.status === `recording`,
		isStopped: (state): IsActive => state.status === `stopped`
	},

	actions: {
		setFromIpc(payload: RecorderStatusPayload): void {
			this.status = payload.isRecording ? `recording` : `stopped`;
			this.sessionId = payload.sessionId;
		}
	}
});
