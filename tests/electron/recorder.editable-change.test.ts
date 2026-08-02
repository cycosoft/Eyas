// @vitest-environment happy-dom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import type { RecordingStep, EditableChangeStep } from '@registry/recording.js';

// The capture half of the contenteditable self-healing corrector. A rich-text editor never fires
// `change`, so there was nothing for replay to snap a drifted editor back to — see
// recorder.contenteditable.test.ts for the keystroke capture this backstops, and
// session-playback.editable-heal.test.ts for the replay half.

const send = vi.fn();

vi.mock(`electron`, () => ({
	ipcRenderer: { send }
}));

function flush(): RecordingStep[] {
	return send.mock.calls
		.filter(call => call[0] === `recorder-flush-steps`)
		.flatMap(call => call[1] as RecordingStep[]);
}

function editableSteps(): EditableChangeStep[] {
	return flush().filter(step => step.type === `editableChange`) as EditableChangeStep[];
}

function makeEditor(): HTMLElement {
	const el = document.createElement(`div`);
	// the shape from the consumer app under test: a Quasar q-editor content root
	el.className = `q-editor__content`;
	el.setAttribute(`contenteditable`, `true`);
	document.body.appendChild(el);
	return el;
}

/** Walks an editor through the focus -> type -> leave cycle the recorder keys off. */
function edit(editor: HTMLElement, text: EditableChangeStep[`text`], relatedTarget: Element | null = null): void {
	editor.dispatchEvent(new FocusEvent(`focusin`, { bubbles: true }));
	editor.textContent = text;
	editor.dispatchEvent(new FocusEvent(`focusout`, { bubbles: true, relatedTarget }));
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

describe(`contenteditable change capture`, () => {
	test(`records the editor's text when the user leaves it`, () => {
		edit(makeEditor(), `Rich text`);

		expect(editableSteps()).toHaveLength(1);
		expect(editableSteps()[0].text).toBe(`Rich text`);
	});

	test(`records nothing when the text didn't change while the user was in the editor`, () => {
		const editor = makeEditor();
		editor.textContent = `Untouched`;

		editor.dispatchEvent(new FocusEvent(`focusin`, { bubbles: true }));
		editor.dispatchEvent(new FocusEvent(`focusout`, { bubbles: true }));

		// mirrors `change` semantics — a field the user only visited isn't an edit
		expect(editableSteps()).toHaveLength(0);
	});

	test(`records nothing when focus merely moves within the same editor`, () => {
		const editor = makeEditor();
		const inner = document.createElement(`b`);
		editor.appendChild(inner);

		editor.dispatchEvent(new FocusEvent(`focusin`, { bubbles: true }));
		editor.textContent = `Mid-edit`;
		// a toolbar button handing focus back, or focus landing on an inner node — the edit isn't over,
		// and correcting here would fight the keystrokes still to come
		editor.dispatchEvent(new FocusEvent(`focusout`, { bubbles: true, relatedTarget: editor }));

		expect(editableSteps()).toHaveLength(0);
	});

	test(`records the pending edit when the page navigates away with the editor still focused`, () => {
		const editor = makeEditor();

		editor.dispatchEvent(new FocusEvent(`focusin`, { bubbles: true }));
		editor.textContent = `Never blurred`;
		// no focusout ever fires on navigation — beforeunload is the last chance to capture it
		window.dispatchEvent(new Event(`beforeunload`));

		expect(editableSteps()).toHaveLength(1);
		expect(editableSteps()[0].text).toBe(`Never blurred`);
	});

	test(`resolves an uneditable island inside an editor to the editor around it`, () => {
		const editor = makeEditor();
		const island = document.createElement(`span`);
		island.setAttribute(`contenteditable`, `false`);
		editor.appendChild(island);

		island.dispatchEvent(new FocusEvent(`focusin`, { bubbles: true }));
		editor.appendChild(document.createTextNode(`Whole editor`));
		island.dispatchEvent(new FocusEvent(`focusout`, { bubbles: true }));

		expect(editableSteps()).toHaveLength(1);
		expect(editableSteps()[0].text).toBe(`Whole editor`);
	});

	test(`records nothing for an excluded editor`, () => {
		const editor = makeEditor();
		editor.setAttribute(`data-eyas-no-record`, ``);

		edit(editor, `Secret`);

		expect(editableSteps()).toHaveLength(0);
	});

	test(`captures no selector derived from the editor's own text`, () => {
		edit(makeEditor(), `Rich text`);

		// load-bearing: the heal only runs when the text drifted, which is exactly when an
		// `aria/Rich text` or `text/Rich text` candidate fails to resolve. A corrector that can only
		// find its target when the target is already correct is no corrector at all.
		const selectors = editableSteps()[0].selectors;
		expect(selectors.some(s => s.includes(`Rich text`))).toBe(false);
		expect(selectors.length).toBeGreaterThan(0);
	});

	test(`still captures a stable aria-label, which doesn't come from the editor's content`, () => {
		const editor = makeEditor();
		editor.setAttribute(`aria-label`, `Description`);

		edit(editor, `Rich text`);

		expect(editableSteps()[0].selectors[0]).toBe(`aria/Description`);
	});
});
