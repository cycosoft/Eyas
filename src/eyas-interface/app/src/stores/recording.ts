import { defineStore } from 'pinia';
import type { RecordingState } from '@/types/recording.js';
import type { IsActive, ProgressRatio, Count, DetailText, SessionId } from '@registry/primitives.js';

const MISMATCH_DETAIL_LIMIT: Count = 5;
import type { RecorderStatusPayload } from '@registry/recording.js';
import type { RecorderPlaybackStatusPayload, RecorderSessionsListedPayload, RecorderSessionLoadedPayload, RecorderRunStepsLoadedPayload, RecordingSessionSummary } from '@registry/ipc.js';

export default defineStore(`recording`, {
	state: (): RecordingState => ({
		completedSteps: 0,
		currentStepIndex: null,
		isPanelOpen: false,
		pendingFailureScrollSessionId: null,
		playbackError: null,
		playbackMismatches: [],
		playbackSchemaWarning: null,
		playbackStatus: null,
		runStepOutcomes: null,
		savedSessions: [],
		selectedSessionDetail: null,
		selectedSessionId: null,
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
		},

		selectedSession: (state): RecordingSessionSummary | null => (
			state.savedSessions.find(session => session.sessionId === state.selectedSessionId) ?? null
		)
	},

	actions: {
		togglePanel(): void {
			this.isPanelOpen = !this.isPanelOpen;
			if (!this.isPanelOpen) {
				this.selectedSessionId = null;
				this.selectedSessionDetail = null;
				return;
			}
			// opening onto an already-running playback should drop straight into that recording's
			// detail view rather than the browser list, so the tester doesn't have to hunt for the
			// row that's actively blinking
			if (this.isPlaying && this.sessionId) {
				this.selectSession(this.sessionId);
			}
		},

		setSessionsList(payload: RecorderSessionsListedPayload): void {
			this.savedSessions = payload;
		},

		selectSession(sessionId: SessionId): void {
			this.selectedSessionId = sessionId;
			this.selectedSessionDetail = null;
			this.runStepOutcomes = null;
		},

		setSelectedSessionDetail(payload: RecorderSessionLoadedPayload): void {
			if (payload?.sessionId !== this.selectedSessionId) { return; }
			this.selectedSessionDetail = payload;
		},

		setRunStepOutcomes(payload: RecorderRunStepsLoadedPayload): void {
			if (payload?.sessionId !== this.selectedSessionId) { return; }
			this.runStepOutcomes = payload;
		},

		clearPendingFailureScroll(): void {
			this.pendingFailureScrollSessionId = null;
		},

		backToBrowser(): void {
			this.selectedSessionId = null;
			this.selectedSessionDetail = null;
			this.runStepOutcomes = null;
		},

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
				this.currentStepIndex = null;
			}
		},

		setPlaybackStatus(payload: RecorderPlaybackStatusPayload): void {
			// a step's mismatch, if any, is already known by the time that step's `playing` payload
			// arrives, so findings accumulate across the run now instead of arriving all at once at the
			// end — clear only on the transition into a new run, or a later step's progress event would
			// wipe an earlier step's already-reported finding
			if (payload.status === `playing` && this.playbackStatus !== `playing`) { this.playbackMismatches = []; }
			this.playbackStatus = payload.status;
			this.sessionId = payload.sessionId ?? this.sessionId;
			this.playbackError = payload.status === `failed` ? (payload.error ?? `Playback failed.`) : null;
			this.playbackMismatches = payload.status === `playing` ? (payload.mismatches ?? this.playbackMismatches) : (payload.mismatches ?? []);
			// only the `playing` payload carries this, and it has to outlive that payload — the run it
			// warns about is still degraded once it finishes, and the end is when the tester reads the
			// results. Falling back to `?? null` on every status would clear it at exactly that moment.
			if (payload.status === `playing`) { this.playbackSchemaWarning = payload.schemaWarning ?? null; }
			this.currentStepIndex = payload.status === `playing` ? (payload.currentStepIndex ?? this.currentStepIndex) : null;
			this.applyProgressCounts(payload);
			this.openOnFailureIfPanelClosed(payload.status);
		},

		// split out of setPlaybackStatus purely to keep that method's branching under the lint complexity cap
		applyProgressCounts(payload: RecorderPlaybackStatusPayload): void {
			if (payload.status !== `playing`) {
				this.completedSteps = 0;
				this.totalSteps = 0;
				return;
			}
			this.completedSteps = payload.completedSteps ?? this.completedSteps;
			this.totalSteps = payload.totalSteps ?? this.totalSteps;
		},

		// A failed run that finished while the tester wasn't looking should announce itself, rather
		// than sitting behind a closed panel until they happen to notice and go find it themselves.
		openOnFailureIfPanelClosed(status: RecorderPlaybackStatusPayload[`status`]): void {
			const justFailed = status === `failed` || (status === `stopped` && this.playbackMismatches.length > 0);
			if (!justFailed || this.isPanelOpen || !this.sessionId) { return; }
			this.isPanelOpen = true;
			this.selectSession(this.sessionId);
			this.pendingFailureScrollSessionId = this.sessionId;
		}
	}
});
