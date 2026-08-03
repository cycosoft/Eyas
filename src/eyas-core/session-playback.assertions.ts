import type { EditableChangeStep, ReplayMismatch } from '@registry/recording.js';
import type { StepIndex, VariableValue } from '@registry/primitives.js';
import type { RecorderPlaybackStatusPayload } from '@registry/ipc.js';
import { buildEditableTextProbeScript } from './session-playback.selector-resolution.js';

// Replay-time assertions. A recording says "when I did this, the editor ended up saying X" — on
// replay that's an expectation to check, not a value to force. Writing it back would overwrite
// whatever the app under test actually produced, which is the one thing a QA tool must never do:
// it papers over both replay infidelity and the genuine defect the tester is chasing.
//
// Mismatches are collected and reported at the end of the run rather than thrown. A failed
// expectation is a finding; aborting on the first one would discard every finding behind it, and
// until capture fidelity improves (see TODO.md) these are expected to be common.

let _mismatches: ReplayMismatch[] = [];

/** A previous run's findings must not bleed into this one. */
export function resetMismatches(): void {
	_mismatches = [];
}

export function getMismatches(): ReplayMismatch[] {
	return _mismatches;
}

/**
 * The findings as a status-payload fragment. Omitted entirely when the run had none, so a clean
 * replay's status stays byte-identical to what it was before assertions existed.
 */
export function mismatchPayload(): Partial<RecorderPlaybackStatusPayload> {
	return _mismatches.length > 0 ? { mismatches: _mismatches } : {};
}

/**
 * Line-preserving text normalization. Leading/trailing space and runs of spaces within a line are
 * layout noise and shouldn't read as a failure — but a lost line break is a real difference, so
 * `\n` survives where a blanket `\s+` collapse would have silently equated "Line 1\nLine 2" with
 * "Line 1 Line 2". Trailing blank lines go, since an editor commonly keeps a stray final <br>.
 */
export function normalizeEditableText(text: VariableValue): VariableValue {
	return text
		.split(/\r?\n/)
		.map(line => line.replace(/[^\S\n]+/g, ` `).trim())
		.join(`\n`)
		.replace(/\n+$/, ``)
		.replace(/^\n+/, ``);
}

/**
 * Checks a contenteditable root against the text recorded for it, collecting a mismatch rather than
 * throwing. Never rejects: a probe that can't run (context torn down by a navigation mid-step) is
 * reported as an unresolved element, which is still more useful than a silent pass.
 */
export async function checkEditableText(target: Electron.WebContents, step: EditableChangeStep, stepIndex: StepIndex): Promise<void> {
	let result: unknown;
	try {
		result = await target.executeJavaScript(buildEditableTextProbeScript(step.selectors));
	} catch {
		result = null;
	}
	// anything that isn't a string is "couldn't read it" — the probe returns null for an unresolved
	// element, and a torn-down context can resolve with undefined rather than rejecting
	const actual: VariableValue | null = typeof result === `string` ? result : null;

	if (actual !== null && normalizeEditableText(actual) === normalizeEditableText(step.text)) { return; }

	_mismatches.push({
		selector: step.selectors[0],
		expected: step.text,
		actual,
		stepIndex
	});
}
