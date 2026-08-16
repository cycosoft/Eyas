import type { StepCount, StepIndex, DetailText, IsActive } from '@registry/primitives.js';
import type { ReplayMismatch, EyasRecordingEnvelope } from '@registry/recording.js';
import type { RecordingSessionSummary, RecorderRunStepsLoadedPayload } from '@registry/ipc.js';

export type RecordingState = {
	completedSteps: StepCount;
	currentStepIndex: StepIndex | null;
	isPanelOpen: IsActive;
	playbackError: string | null;
	playbackMismatches: ReplayMismatch[];
	playbackSchemaWarning: DetailText | null;
	playbackStatus: `playing` | `stopped` | `failed` | null;
	runStepOutcomes: RecorderRunStepsLoadedPayload;
	savedSessions: RecordingSessionSummary[];
	selectedSessionDetail: EyasRecordingEnvelope | null;
	selectedSessionId: string | null;
	sessionId: string | null;
	status: `recording` | `stopped` | null;
	totalSteps: StepCount;
}
