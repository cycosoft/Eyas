// @vitest-environment happy-dom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import type { RecordingStep, KeyDownStep } from '@registry/recording.js';

// Split out of recorder.test.ts, which is at its max-lines ceiling.
//
// Standing in for a check we can't otherwise make: sessions aren't exposed anywhere a user can open
// them, so these tests are how we know a rich-text editor's keystrokes reach the session file at all.
// They do — a contenteditable root is an ordinary keydown target. What it *doesn't* get is a cursor
// selection (that's input/textarea-only), which is what routes it down the CDP path at replay time
// rather than the `.value` splice. See session-playback.service.contenteditable.test.ts.

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
	test(`records a printable keystroke typed into a contenteditable root`, () => {
		const editor = makeEditor();

		editor.dispatchEvent(new KeyboardEvent(`keydown`, { key: `h`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		expect(keyDownSteps()).toHaveLength(1);
		expect(keyDownSteps()[0].key).toBe(`h`);
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

		editor.dispatchEvent(new KeyboardEvent(`keydown`, { key: `h`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		// this absence is load-bearing: it's what sends the step down the CDP key-event path at replay
		expect(keyDownSteps()[0].selectionStart).toBeUndefined();
		expect(keyDownSteps()[0].selectionEnd).toBeUndefined();
	});

	test(`records the matching keyUp, so the page sees a complete key sequence`, () => {
		const editor = makeEditor();

		editor.dispatchEvent(new KeyboardEvent(`keyup`, { key: `h`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		expect(flush().filter(step => step.type === `keyUp`)).toHaveLength(1);
	});

	test(`fires no change step for a contenteditable root, so replay has no final-value corrector`, () => {
		const editor = makeEditor();

		editor.dispatchEvent(new KeyboardEvent(`keydown`, { key: `h`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		// contenteditable never fires `change` — an <input> would get a value-snapping step here
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
