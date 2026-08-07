import type { StepCount, DetailText, IsActive } from '@registry/primitives.js';
import type { ReplayMismatch } from '@registry/recording.js';

export type RecordingState = {
	completedSteps: StepCount;
	isPanelOpen: IsActive;
	playbackError: string | null;
	playbackMismatches: ReplayMismatch[];
	playbackSchemaWarning: DetailText | null;
	playbackStatus: `playing` | `stopped` | `failed` | null;
	sessionId: string | null;
	status: `recording` | `stopped` | null;
	totalSteps: StepCount;
}
