import type { StepIndex, Count, ColorHex } from '@registry/primitives.js';
import type { ReplayMismatch } from '@registry/recording.js';
import type { RunStepOutcomes } from '@registry/ipc.js';

export type StepDotClass = `recording` | `recording-active` | `playing-active` | `passed` | `failed` | `neutral`;

/** A theme token (e.g. Vuetify's `primary`) or a literal hex, either of which `dot-color` accepts as a plain string. */
export type DotColor = ColorHex | `primary`;

const STEP_DOT_COLORS: Record<StepDotClass, DotColor> = {
	passed: `#43a047`,
	failed: `#e53935`,
	recording: `primary`,
	'recording-active': `primary`,
	'playing-active': `#9e9e9e`,
	neutral: `#9e9e9e`
};

/** Base color for Vuetify's dot-color prop; the blink animation is layered on separately via the step-dot--* class (see RecordingPanel.vue's :deep() rule). */
export function stepDotColorFor(stepDotClass: StepDotClass): DotColor {
	return STEP_DOT_COLORS[stepDotClass];
}

type RecordingArgs = { totalSteps: Count };
type PlayingArgs = { currentStepIndex: StepIndex | null; playbackMismatches: ReplayMismatch[] };

/**
 * A step's icon color/blink state in the recording detail view, view-anchored to the session
 * whose steps are being rendered (callers only invoke this when that session is the active one).
 *
 * - Recording: every step is blue, the last one blinking.
 * - Playing: steps behind the active one resolve red/green from mismatches found so far (already
 *   known live — see session-playback.assertions.ts), the active step blinks grey, steps ahead are grey.
 * - Idle: the last finished run's persisted per-step outcome, or grey if never run / that run never finished.
 */
export function stepDotClassFor(index: StepIndex, recording: RecordingArgs | null, playing: PlayingArgs | null, runStepOutcomes: RunStepOutcomes | null): StepDotClass {
	if (recording) { return index === recording.totalSteps - 1 ? `recording-active` : `recording`; }

	if (playing) {
		const { currentStepIndex, playbackMismatches } = playing;
		if (currentStepIndex === null || index > currentStepIndex) { return `neutral`; }
		if (index === currentStepIndex) { return `playing-active`; }
		return playbackMismatches.some(mismatch => mismatch.stepIndex === index) ? `failed` : `passed`;
	}

	return runStepOutcomes?.[index] ?? `neutral`;
}

/** Lowest step index recorded as `failed` in a finished run's outcomes, or undefined if none did. */
export function firstFailingStepIndex(outcomes: RunStepOutcomes): StepIndex | undefined {
	return Object.keys(outcomes)
		.map(Number)
		.filter(index => outcomes[index] === `failed`)
		.sort((a, b) => a - b)[0];
}
