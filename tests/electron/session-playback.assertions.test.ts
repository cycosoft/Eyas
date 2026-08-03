import { describe, test, expect, vi, beforeEach } from 'vitest';
import { normalizeEditableText, checkEditableText, getMismatches, resetMismatches } from '@core/session-playback.assertions.js';
import type { EditableChangeStep } from '@registry/recording.js';
import type { StepIndex, VariableValue } from '@registry/primitives.js';

// The judging half of the contenteditable assertion — deliberately browser-free. The page-side read
// it consumes is covered against real Chromium in session-playback.editable-probe.test.ts.

const executeJavaScript = vi.fn();

function makeTarget(): Electron.WebContents {
	return { executeJavaScript } as unknown as Electron.WebContents;
}

function makeStep(text: EditableChangeStep[`text`]): EditableChangeStep {
	return { type: `editableChange`, selectors: [`testid/editor`], text, timestamp: 1 };
}

/** Runs one assertion against a page that reports `actual`, and returns whatever was collected. */
async function check(recorded: VariableValue, actual: VariableValue | null, stepIndex: StepIndex = 0): Promise<ReturnType<typeof getMismatches>> {
	executeJavaScript.mockResolvedValue(actual);
	await checkEditableText(makeTarget(), makeStep(recorded), stepIndex);
	return getMismatches();
}

beforeEach(() => {
	executeJavaScript.mockReset();
	resetMismatches();
});

describe(`normalizeEditableText`, () => {
	test(`collapses runs of spaces within a line`, () => {
		expect(normalizeEditableText(`Rich    text`)).toBe(`Rich text`);
	});

	test(`trims each line independently`, () => {
		expect(normalizeEditableText(`  Line 1  \n  Line 2  `)).toBe(`Line 1\nLine 2`);
	});

	test(`keeps line breaks, so a lost paragraph is not normalized away`, () => {
		// the bug the old corrector's blanket \s+ collapse had: it equated these two, which meant a
		// flattened editor read as matching and the loss was never reported
		expect(normalizeEditableText(`Line 1\nLine 2`)).not.toBe(normalizeEditableText(`Line 1 Line 2`));
	});

	test(`drops trailing blank lines, which editors leave behind as a stray final break`, () => {
		expect(normalizeEditableText(`Rich text\n\n`)).toBe(`Rich text`);
	});
});

describe(`checkEditableText`, () => {
	test(`collects nothing when the page matches what was recorded`, async () => {
		expect(await check(`Rich text`, `Rich text`)).toHaveLength(0);
	});

	test(`collects nothing when the page differs only in layout whitespace`, async () => {
		expect(await check(`Rich text`, `  Rich   text  `)).toHaveLength(0);
	});

	test(`collects a mismatch when the text drifted`, async () => {
		const [mismatch] = await check(`Rich text`, `Rch txt`);

		expect(mismatch).toEqual({ selector: `testid/editor`, expected: `Rich text`, actual: `Rch txt`, stepIndex: 0 });
	});

	test(`reports the raw page text, not a normalized version, so the reader sees what's really there`, async () => {
		const [mismatch] = await check(`Line 1\nLine 2`, `Line 1 Line 2`);

		expect(mismatch.actual).toBe(`Line 1 Line 2`);
	});

	test(`records a null actual when the element never resolved, distinct from wrong text`, async () => {
		const [mismatch] = await check(`Rich text`, null);

		expect(mismatch.actual).toBeNull();
	});

	test(`records a null actual when the probe itself throws, rather than passing silently`, async () => {
		// a navigation mid-step tears down the execution context — "couldn't check" must not read as "fine"
		executeJavaScript.mockRejectedValue(new Error(`Script failed to execute`));

		await checkEditableText(makeTarget(), makeStep(`Rich text`), 0);

		expect(getMismatches()[0].actual).toBeNull();
	});

	test(`never throws, so one failed expectation can't abort the rest of the replay`, async () => {
		await expect(checkEditableText(makeTarget(), makeStep(`Rich text`), 0)).resolves.toBeUndefined();
	});

	test(`accumulates findings across steps, tagged with the step they came from`, async () => {
		await check(`First`, `wrong`, 3);
		const mismatches = await check(`Second`, `also wrong`, 7);

		expect(mismatches.map(m => m.stepIndex)).toEqual([3, 7]);
	});

	test(`resetMismatches clears a previous run's findings`, async () => {
		await check(`Rich text`, `drift`);

		resetMismatches();

		expect(getMismatches()).toHaveLength(0);
	});
});
