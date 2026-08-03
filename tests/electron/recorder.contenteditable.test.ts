// @vitest-environment happy-dom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import type { RecordingStep, KeyDownStep } from '@registry/recording.js';

// Split out of recorder.test.ts, which is at its max-lines ceiling.
//
// Standing in for a check we can't otherwise make: sessions aren't exposed anywhere a user can open
// them, so these tests are how we know what a rich-text editor's edits look like in the session file.
//
// Printable typing in a contenteditable is normally recorded from the `input` event instead
// (recorder.editable-input.test.ts), because keystrokes could never account for a paste. The
// keystroke is still recorded first and *retracted* only once that replacement actually exists —
// predicting it from the key alone would silently lose a composing dead key, which produces no
// replayable input step. What stays a keyDown is everything the input event doesn't stand in for:
// editing commands, functional keys, chords, and composition. Those get no
// cursor selection (that's input/textarea-only), which is what routes them down the CDP path at
// replay rather than the `.value` splice. See session-playback.service.contenteditable.test.ts.

const send = vi.fn();

vi.mock(`electron`, () => ({
	ipcRenderer: { send }
}));

function flush(): RecordingStep[] {
	return send.mock.calls
		.filter(call => call[0] === `recorder-flush-steps`)
		.flatMap(call => call[1] as RecordingStep[]);
}

function keyDownSteps(): KeyDownStep[] {
	return flush().filter(step => step.type === `keyDown`) as KeyDownStep[];
}

function makeEditor(): HTMLElement {
	const el = document.createElement(`div`);
	// the shape from the consumer app under test: a Quasar q-editor content root
	el.className = `bg-gray-200 normal-bullets q-editor__content`;
	el.setAttribute(`contenteditable`, `true`);
	document.body.appendChild(el);
	return el;
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

describe(`contenteditable capture`, () => {
	/** The real event order for a printable key: the browser fires `input` right after `keydown`. */
	function typeChar(editor: HTMLElement, key: KeyDownStep[`key`]): void {
		editor.dispatchEvent(new KeyboardEvent(`keydown`, { key, bubbles: true }));
		editor.dispatchEvent(new InputEvent(`input`, { bubbles: true, inputType: `insertText`, data: key }));
	}

	test(`retracts the keystroke for a printable character once the input event supersedes it`, () => {
		const editor = makeEditor();

		typeChar(editor, `h`);
		vi.advanceTimersByTime(2000);

		// recording both accounts of one edit would type it twice on replay
		expect(keyDownSteps()).toHaveLength(0);
		expect(flush().filter(step => step.type === `editableInput`)).toHaveLength(1);
	});

	test(`keeps the keystroke when no input event supersedes it, as with a composing dead key`, () => {
		const editor = makeEditor();

		// a dead key fires insertCompositionText, which isn't replayable and so isn't recorded —
		// dropping the keystroke on the assumption an input step would replace it would lose the
		// character entirely, where today it at least replays as the bare letter
		editor.dispatchEvent(new KeyboardEvent(`keydown`, { key: `e`, bubbles: true }));
		editor.dispatchEvent(new InputEvent(`input`, { bubbles: true, inputType: `insertCompositionText`, data: `ê` }));
		vi.advanceTimersByTime(2000);

		expect(keyDownSteps().map(step => step.key)).toEqual([`e`]);
	});

	test(`keeps the keystroke when no input event follows at all`, () => {
		const editor = makeEditor();

		// a page that calls preventDefault on the keydown produces no edit — the keystroke is still
		// what happened, and is still what replay should send
		editor.dispatchEvent(new KeyboardEvent(`keydown`, { key: `h`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		expect(keyDownSteps().map(step => step.key)).toEqual([`h`]);
	});

	test(`still records a printable keystroke outside a contenteditable root`, () => {
		const input = document.createElement(`input`);
		document.body.appendChild(input);

		input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `h`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		// the `.value` splice path is untouched by any of this
		expect(keyDownSteps().map(step => step.key)).toEqual([`h`]);
	});

	test(`still records the character half of a chord, which is a command rather than text`, () => {
		const editor = makeEditor();

		// Ctrl+A produces no text-inserting input event, so nothing else would capture it
		editor.dispatchEvent(new KeyboardEvent(`keydown`, { key: `a`, ctrlKey: true, bubbles: true }));
		vi.advanceTimersByTime(2000);

		expect(keyDownSteps().map(step => step.key)).toEqual([`a`]);
	});

	test(`records which modifiers were held, so a chord doesn't have to be inferred from earlier steps`, () => {
		const editor = makeEditor();

		editor.dispatchEvent(new KeyboardEvent(`keydown`, { key: `a`, ctrlKey: true, shiftKey: true, bubbles: true }));
		vi.advanceTimersByTime(2000);

		expect(keyDownSteps()[0].modifiers).toEqual({ ctrl: true, shift: true });
	});

	test(`records no modifiers at all for an unmodified key`, () => {
		const editor = makeEditor();

		editor.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Backspace`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		// keeps an ordinary keystroke's step exactly what it was before modifier capture existed —
		// and the absence is what tells replay to fall back to inference for older sessions
		expect(keyDownSteps()[0].modifiers).toBeUndefined();
	});

	test(`records Backspace and Delete, which replay as editing commands rather than inserted text`, () => {
		const editor = makeEditor();

		editor.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Backspace`, bubbles: true }));
		editor.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Delete`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		expect(keyDownSteps().map(step => step.key)).toEqual([`Backspace`, `Delete`]);
	});

	test(`omits the cursor selection, since a contenteditable root has no selectionStart/selectionEnd`, () => {
		const editor = makeEditor();

		editor.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Backspace`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		// this absence is load-bearing: it's what sends the step down the CDP key-event path at replay
		expect(keyDownSteps()[0].selectionStart).toBeUndefined();
		expect(keyDownSteps()[0].selectionEnd).toBeUndefined();
	});

	test(`records the matching keyUp, so the page sees a complete key sequence`, () => {
		const editor = makeEditor();

		editor.dispatchEvent(new KeyboardEvent(`keyup`, { key: `Backspace`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		expect(flush().filter(step => step.type === `keyUp`)).toHaveLength(1);
	});

	test(`drops the keyUp of a retracted keystroke too, not just its keyDown`, () => {
		const editor = makeEditor();

		typeChar(editor, `h`);
		editor.dispatchEvent(new KeyboardEvent(`keyup`, { key: `h`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		// replaying a keyup whose keydown was retracted shows the page half a key sequence
		expect(flush().filter(step => step.type === `keyUp`)).toHaveLength(0);
	});

	test(`keeps the keyUp when its keyDown was kept`, () => {
		const editor = makeEditor();

		editor.dispatchEvent(new KeyboardEvent(`keydown`, { key: `h`, bubbles: true }));
		editor.dispatchEvent(new KeyboardEvent(`keyup`, { key: `h`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		expect(flush().filter(step => step.type === `keyUp`)).toHaveLength(1);
	});

	test(`fires no change step for a contenteditable root, whatever the user types`, () => {
		const editor = makeEditor();

		editor.dispatchEvent(new KeyboardEvent(`keydown`, { key: `h`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		// contenteditable never fires `change` — an <input> would get a value-snapping step here. What
		// the editor gets instead is an `editableChange` on blur, which replay *checks* rather than
		// writes; see recorder.editable-change.test.ts and session-playback.assertions.ts.
		expect(flush().filter(step => step.type === `change`)).toHaveLength(0);
	});

	test(`still captures a cursor selection for a textarea, which keeps taking the value-splice path`, () => {
		const textarea = document.createElement(`textarea`);
		textarea.value = `hi`;
		document.body.appendChild(textarea);
		textarea.setSelectionRange(2, 2);

		textarea.dispatchEvent(new KeyboardEvent(`keydown`, { key: `!`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		expect(keyDownSteps()[0].selectionStart).toBe(2);
		expect(keyDownSteps()[0].selectionEnd).toBe(2);
	});
});
