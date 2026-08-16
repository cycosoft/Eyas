import type { CoreContext } from '@registry/eyas-core.js';
import type { RecordingStep, StepActionMap, StepActionIndex, ReplayMismatch } from '@registry/recording.js';
import type { RecorderPlaybackStatusPayload } from '@registry/ipc.js';
import type { StepCount, StepIndex } from '@registry/primitives.js';

export function sendPlaybackStatus(ctx: CoreContext, payload: RecorderPlaybackStatusPayload): void {
	ctx.$eyasLayer?.webContents?.send(`recorder-playback-status`, payload);
}

/**
 * Maps each step to the user-facing "action" it belongs to, for progress-ring purposes: a click
 * and the `navigate` step(s) it causes (including redirect chains) are one action, and `scroll`
 * steps aren't actions at all — neither should move or count toward the ring.
 */
export function computeStepActions(steps: RecordingStep[]): StepActionMap {
	const actionIndexes: StepActionIndex[] = [];
	let actionCount = 0;
	let lastActionIndex: StepActionIndex = -1;
	for (const step of steps) {
		if (step.type === `scroll`) {
			actionIndexes.push(-1);
			continue;
		}
		if (step.type === `navigate` && lastActionIndex !== -1) {
			actionIndexes.push(lastActionIndex);
			continue;
		}
		lastActionIndex = actionCount++;
		actionIndexes.push(lastActionIndex);
	}
	return { actionIndexes, totalActions: actionCount as StepCount };
}

/**
 * Reports progress for a just-dispatched step, always carrying `currentStepIndex` and the
 * mismatches accumulated so far (for the detail view's per-step live icons) — but only advancing
 * the progress ring's `completedSteps`/`totalSteps` when the step counts as its own action (see
 * computeStepActions), same as before this field was added.
 */
export function reportStepProgress(ctx: CoreContext, actions: StepActionMap, stepIndex: StepIndex, mismatchesSoFar: ReplayMismatch[]): void {
	const actionIndex: StepActionIndex = actions.actionIndexes[stepIndex];
	const payload: RecorderPlaybackStatusPayload = { status: `playing`, currentStepIndex: stepIndex };
	if (mismatchesSoFar.length > 0) { payload.mismatches = mismatchesSoFar; }
	if (actionIndex !== -1) {
		payload.completedSteps = (actionIndex + 1) as StepCount;
		payload.totalSteps = actions.totalActions;
	}
	sendPlaybackStatus(ctx, payload);
}
