// @vitest-environment happy-dom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import type { RecordingStep, EditableInputStep } from '@registry/recording.js';
import type { VariableValue } from '@registry/primitives.js';

// Text entered into a rich-text editor is recorded from the browser's own account of the edit (the
// `input` event) rather than reconstructed from keystrokes — a paste recorded `Control`+`v` and
// nothing else, so it replayed as an empty editor.
//
// The set is deliberately narrow. Replay inserts `data` at the caret, so an edit is recorded only
// when that's genuinely what it does; the ones left out would each replay as *wrong* text rather
// than as missing text, which the blur assertion reports instead.
//
// The event shapes asserted here (notably a paste's null `data` and its text on `dataTransfer`,
// present on `input` and not only `beforeinput`) were verified against real Chromium before being
// written down. The keystroke suppression that stops the two accounts double-applying lives in
// recorder.contenteditable.test.ts.

const send = vi.fn();

vi.mock(`electron`, () => ({
	ipcRenderer: { send }
}));

function flush(): RecordingStep[] {
	return send.mock.calls
		.filter(call => call[0] === `recorder-flush-steps`)
		.flatMap(call => call[1] as RecordingStep[]);
}

function inputSteps(): EditableInputStep[] {
	return flush().filter(step => step.type === `editableInput`) as EditableInputStep[];
}

function makeEditor(): HTMLElement {
	const el = document.createElement(`div`);
	// the shape from the consumer app under test: a Quasar q-editor content root
	el.className = `q-editor__content`;
	el.setAttribute(`contenteditable`, `true`);
	document.body.appendChild(el);
	return el;
}

/** Dispatches the `input` event a browser would fire for one edit. */
function type(target: Element, inputType: EditableInputStep[`inputType`], data: VariableValue | null): void {
	target.dispatchEvent(new InputEvent(`input`, { bubbles: true, inputType, data }));
}

/** A paste/drop leaves `data` null and carries its payload on dataTransfer instead. */
function paste(target: Element, text: VariableValue): void {
	const dataTransfer = new DataTransfer();
	dataTransfer.setData(`text/plain`, text);
	target.dispatchEvent(new InputEvent(`input`, { bubbles: true, inputType: `insertFromPaste`, data: null, dataTransfer }));
}

// The recorder preload registers its listeners/interval once at import time (real preload
// lifecycle), so it's imported exactly once for the whole file — see recorder.test.ts.
beforeAll(() => {
	vi.useFakeTimers();
	return import(`../../src/scripts/recorder.js`);
});

afterAll(() => {
	vi.useRealTimers();
});

beforeEach(() => {
	send.mockClear();
	document.body.innerHTML = ``;
});

afterEach(() => {
	// drain anything buffered-but-unflushed so it can't leak into the next test
	vi.advanceTimersByTime(2000);
});

describe(`contenteditable input capture`, () => {
	test(`records typed text`, () => {
		type(makeEditor(), `insertText`, `h`);
		vi.advanceTimersByTime(2000);

		expect(inputSteps()).toHaveLength(1);
		expect(inputSteps()[0].data).toBe(`h`);
	});

	test(`records a paste, which keystroke capture could never see`, () => {
		paste(makeEditor(), `PASTED`);
		vi.advanceTimersByTime(2000);

		// the single largest source of replay drift: Ctrl+V records `Control` and `v`, and the pasted
		// content appears in no keystroke at all
		expect(inputSteps()[0].data).toBe(`PASTED`);
		expect(inputSteps()[0].inputType).toBe(`insertFromPaste`);
	});

	test(`records nothing for a spellcheck replacement, which replay would apply as a second insertion`, () => {
		const editor = makeEditor();

		// the user typed "teh" and spellcheck corrected it. Those three characters are already in the
		// step list as keystrokes, and the range this replaces exists only on `beforeinput` — so
		// inserting "the" at the caret on replay would produce "tehthe" rather than a correction.
		type(editor, `insertText`, `t`);
		type(editor, `insertText`, `e`);
		type(editor, `insertText`, `h`);
		type(editor, `insertReplacementText`, `the`);
		vi.advanceTimersByTime(2000);

		expect(inputSteps().map(step => step.data)).toEqual([`t`, `e`, `h`]);
	});

	test(`records nothing for a transpose, which introduces no text to insert`, () => {
		type(makeEditor(), `insertTranspose`, `ab`);
		vi.advanceTimersByTime(2000);

		expect(inputSteps()).toHaveLength(0);
	});

	test(`keeps the browser's own classification of the edit`, () => {
		const editor = makeEditor();

		type(editor, `insertText`, `a`);
		paste(editor, `b`);
		vi.advanceTimersByTime(2000);

		// worth recording even though replay inserts both the same way: it's what makes a session
		// legible, and what a future exporter would map to a framework's paste vs. type
		expect(inputSteps().map(step => step.inputType)).toEqual([`insertText`, `insertFromPaste`]);
	});

	test(`records nothing for a deletion, which its own keystroke already accounts for`, () => {
		type(makeEditor(), `deleteContentBackward`, null);
		vi.advanceTimersByTime(2000);

		// Backspace is still recorded as a keyDown and replays as virtual key code 8 — capturing the
		// resulting input event too would delete twice
		expect(inputSteps()).toHaveLength(0);
	});

	test(`records nothing for a new paragraph, which Enter already accounts for`, () => {
		type(makeEditor(), `insertParagraph`, null);
		vi.advanceTimersByTime(2000);

		expect(inputSteps()).toHaveLength(0);
	});

	test(`records nothing for IME composition, which can't be replayed as a sequence of insertions`, () => {
		const editor = makeEditor();

		// an IME fires this repeatedly with the whole in-progress string, each firing replacing the
		// last — replaying them in order would concatenate the partials into garbage
		type(editor, `insertCompositionText`, `に`);
		type(editor, `insertCompositionText`, `にほ`);
		type(editor, `insertCompositionText`, `にほん`);
		vi.advanceTimersByTime(2000);

		// the gap is reported by the assertion on leaving the editor rather than replayed wrong
		expect(inputSteps()).toHaveLength(0);
	});

	test(`records nothing for an input event outside a contenteditable root`, () => {
		const input = document.createElement(`input`);
		document.body.appendChild(input);

		type(input, `insertText`, `h`);
		vi.advanceTimersByTime(2000);

		// an <input> replays through the `.value` splice path, which this must not disturb
		expect(inputSteps()).toHaveLength(0);
	});

	test(`records nothing for an excluded editor`, () => {
		const editor = makeEditor();
		editor.setAttribute(`data-eyas-no-record`, ``);

		type(editor, `insertText`, `Secret`);
		vi.advanceTimersByTime(2000);

		expect(inputSteps()).toHaveLength(0);
	});

	test(`attributes an edit inside an uneditable island to the editor around it`, () => {
		const editor = makeEditor();
		const island = document.createElement(`span`);
		island.setAttribute(`contenteditable`, `false`);
		editor.appendChild(island);

		type(island, `insertText`, `h`);
		vi.advanceTimersByTime(2000);

		expect(inputSteps()).toHaveLength(1);
	});
});
