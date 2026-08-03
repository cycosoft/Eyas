import { defineStore } from 'pinia';
import type { RecordingState } from '@/types/recording.js';
import type { IsActive, ProgressRatio, Count, DetailText } from '@registry/primitives.js';

const MISMATCH_DETAIL_LIMIT: Count = 5;
import type { RecorderStatusPayload } from '@registry/recording.js';
import type { RecorderPlaybackStatusPayload } from '@registry/ipc.js';

export default defineStore(`recording`, {
	state: (): RecordingState => ({
		completedSteps: 0,
		playbackError: null,
		playbackMismatches: [],
		playbackSchemaWarning: null,
		playbackStatus: null,
		sessionId: null,
		status: null,
		totalSteps: 0
	}),

	getters: {
		isRecording: (state): IsActive => state.status === `recording`,
		isStopped: (state): IsActive => state.status === `stopped`,
		isPlaying: (state): IsActive => state.playbackStatus === `playing`,
		playbackProgress: (state): ProgressRatio => state.totalSteps > 0 ? state.completedSteps / state.totalSteps : 0,
		mismatchCount: (state): Count => state.playbackMismatches.length,
		/**
		 * One line per finding for the tooltip. Capped, because a broken selector early in a recording
		 * can mismatch on every later step and an unbounded tooltip would run off the window.
		 */
		mismatchSummary: (state): DetailText => {
			const lines = state.playbackMismatches.slice(0, MISMATCH_DETAIL_LIMIT).map(m => (
				m.actual === null
					? `${m.selector}: not found on the page (expected "${m.expected}")`
					: `${m.selector}: expected "${m.expected}", found "${m.actual}"`
			));
			const hidden: Count = state.playbackMismatches.length - lines.length;
			if (hidden > 0) { lines.push(`...and ${hidden} more`); }
			return lines.join(`\n`);
		}
	},

	actions: {
		setFromIpc(payload: RecorderStatusPayload): void {
			this.status = payload.isRecording ? `recording` : `stopped`;
			this.sessionId = payload.sessionId;
			if (payload.isRecording) {
				this.playbackStatus = null;
				this.playbackError = null;
				this.playbackMismatches = [];
				this.playbackSchemaWarning = null;
				this.completedSteps = 0;
				this.totalSteps = 0;
			}
		},

		setPlaybackStatus(payload: RecorderPlaybackStatusPayload): void {
			this.playbackStatus = payload.status;
			this.playbackError = payload.status === `failed` ? (payload.error ?? `Playback failed.`) : null;
			// a run reports its findings once, at the end — `playing` is the start of a new run, so it
			// clears the previous one's rather than leaving them on screen next to a fresh progress ring
			this.playbackMismatches = payload.status === `playing` ? [] : (payload.mismatches ?? []);
			// only the `playing` payload carries this, and it has to outlive that payload — the run it
			// warns about is still degraded once it finishes, and the end is when the tester reads the
			// results. Falling back to `?? null` on every status would clear it at exactly that moment.
			if (payload.status === `playing`) { this.playbackSchemaWarning = payload.schemaWarning ?? null; }
			this.completedSteps = payload.completedSteps ?? this.completedSteps;
			this.totalSteps = payload.totalSteps ?? this.totalSteps;
			if (payload.status !== `playing`) {
				this.completedSteps = 0;
				this.totalSteps = 0;
			}
		}
	}
});
