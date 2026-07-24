import type { StepCount } from '@registry/primitives.js';

export type RecordingState = {
	completedSteps: StepCount;
	playbackError: string | null;
	playbackStatus: `playing` | `stopped` | `failed` | null;
	sessionId: string | null;
	status: `recording` | `stopped` | null;
	totalSteps: StepCount;
}
