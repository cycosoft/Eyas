// @vitest-environment happy-dom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import type { RecordingStep, ClickStep, InputStep, ScrollStep, KeyDownStep } from '@registry/recording.js';

const send = vi.fn();
const addEventListenerCalls: unknown[][] = [];

vi.mock(`electron`, () => ({
	ipcRenderer: { send }
}));

function flush(): RecordingStep[] {
	const calls = send.mock.calls.filter(call => call[0] === `recorder-flush-steps`);
	return calls.flatMap(call => call[1] as RecordingStep[]);
}

// The recorder preload registers its listeners/interval once at import time (real preload
// lifecycle), so it's imported exactly once for the whole file under fake timers, rather than
// per-test — reimporting would stack duplicate `document` listeners across tests.
beforeAll(() => {
	vi.useFakeTimers();
	const spy = vi.spyOn(document, `addEventListener`);
	spy.mockImplementation((...args) => { addEventListenerCalls.push(args); return Document.prototype.addEventListener.apply(document, args as never); });
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
	// Drain any steps buffered-but-unflushed by the test so they don't leak into the next test.
	vi.advanceTimersByTime(2000);
});

// ─── listener registration ───────────────────────────────────────────────────

describe(`event listener registration`, () => {
	test(`registers all DOM event listeners with { capture: true } so stopPropagation() in app code cannot hide events`, () => {
		const events = [`click`, `contextmenu`, `change`, `keydown`, `keyup`, `scroll`];
		for (const evt of events) {
			expect(addEventListenerCalls).toContainEqual([evt, expect.any(Function), { capture: true }]);
		}
	});
});

// ─── click capture ────────────────────────────────────────────────────────────

describe(`click capture`, () => {
	test(`captures a MouseEvent and pushes a ClickStep with a computed SelectorGroup into the buffer`, () => {
		const btn = document.createElement(`button`);
		btn.id = `save`;
		document.body.appendChild(btn);

		btn.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect(steps).toHaveLength(1);
		expect(steps[0].type).toBe(`click`);
		expect((steps[0] as ClickStep).selectors[0]).toBe(`#save`);
	});

	test(`omits button entirely for a left click, so sessions match those recorded before right-click capture`, () => {
		const btn = document.createElement(`button`);
		btn.id = `save`;
		document.body.appendChild(btn);

		btn.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		expect(flush()[0] as ClickStep).not.toHaveProperty(`button`);
	});
});
// Right-click capture lives in recorder.right-click.test.ts (max-lines).

// ─── selector priority ────────────────────────────────────────────────────────
// Candidate priority: aria accessible name -> visible text -> data-testid/data-qa -> #id -> CSS
// positional path. These fixtures give the element no accessible name and no text, so testid/id
// candidates surface at [0]; other describe blocks below exercise aria/text specifically.

describe(`selector priority order`, () => {
	test(`prefers a testid/ candidate (from data-testid) first when the element has no accessible name or text`, () => {
		const el = document.createElement(`button`);
		el.setAttribute(`data-testid`, `submit-btn`);
		el.id = `should-not-win`;
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect((steps[0] as ClickStep).selectors[0]).toBe(`testid/submit-btn`);
	});

	test(`falls back to a testid/ candidate from data-qa when data-testid is absent`, () => {
		const el = document.createElement(`button`);
		el.setAttribute(`data-qa`, `submit-btn`);
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect((steps[0] as ClickStep).selectors[0]).toBe(`testid/submit-btn`);
	});

	test(`prefers an aria/ candidate (from aria-label) over testid/id when present`, () => {
		const el = document.createElement(`button`);
		el.setAttribute(`aria-label`, `Submit form`);
		el.setAttribute(`data-testid`, `should-not-win`);
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect((steps[0] as ClickStep).selectors[0]).toBe(`aria/Submit form`);
	});

	test(`falls back to #id when the element has no accessible name, text, or testid`, () => {
		const el = document.createElement(`button`);
		el.id = `submit-btn`;
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect((steps[0] as ClickStep).selectors[0]).toBe(`#submit-btn`);
	});

	test(`always includes a CSS positional selector candidate as the last-resort fallback`, () => {
		const el = document.createElement(`button`);
		el.id = `submit-btn`;
		el.className = `btn btn-primary`;
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		const candidates = (steps[0] as ClickStep).selectors;
		expect(candidates[candidates.length - 1]).toMatch(/^#submit-btn|button/);
	});

	test.each([
		[`a UUID`, `3fa85f64-5717-4562-b3fc-2c963f66afa6`],
		[`a long hex hash`, `a1b2c3d4e5f6a7b8`],
		[`a useId/Radix-style id`, `r1a`],
		[`an enumerated list-position id`, `tab-2`]
	])(`does not use an id containing a digit (%s) in any candidate, since it looks auto-generated`, (_label, id) => {
		const el = document.createElement(`button`);
		el.id = id;
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		const candidates = (steps[0] as ClickStep).selectors;
		for (const candidate of candidates) { expect(candidate).not.toBe(`#${id}`); }
	});

	test(`still uses a letters/hyphens/underscores-only id as the top candidate, since it has no digits and looks human-authored`, () => {
		const el = document.createElement(`button`);
		el.id = `login-form_submit`;
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect((steps[0] as ClickStep).selectors[0]).toBe(`#login-form_submit`);
	});

	test(`excludes a digit-bearing ancestor id from every candidate, including the positional selector`, () => {
		const ancestor = document.createElement(`div`);
		ancestor.id = `row-42`;
		const el = document.createElement(`button`);
		ancestor.appendChild(el);
		document.body.appendChild(ancestor);

		el.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		const candidates = (steps[0] as ClickStep).selectors;
		for (const candidate of candidates) { expect(candidate).not.toContain(`#row-42`); }
	});
});

// ─── accessible-name / text candidates ─────────────────────────────────────────

describe(`accessible-name and text candidates`, () => {
	test(`uses an aria/ candidate from an associated <label> when the element has no aria-label`, () => {
		const label = document.createElement(`label`);
		label.textContent = `Email address`;
		const input = document.createElement(`input`);
		input.id = `email-field`;
		label.htmlFor = `email-field`;
		document.body.appendChild(label);
		document.body.appendChild(input);

		input.dispatchEvent(new Event(`change`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect((steps[0] as InputStep).selectors[0]).toBe(`aria/Email address`);
	});

	test(`uses a text/ candidate from unique visible text on an element with mixed inline children (no single accessible name computed)`, () => {
		const el = document.createElement(`a`);
		el.innerHTML = `Continue to <strong>checkout</strong>`;
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect((steps[0] as ClickStep).selectors[0]).toBe(`text/Continue to checkout`);
	});

	test(`skips a text/ candidate when the same text is shared by more than one element of the same tag`, () => {
		const first = document.createElement(`a`);
		first.innerHTML = `Save <strong>now</strong>`;
		const second = document.createElement(`a`);
		second.innerHTML = `Save <strong>now</strong>`;
		document.body.appendChild(first);
		document.body.appendChild(second);

		first.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect((steps[0] as ClickStep).selectors).not.toContain(`text/Save now`);
	});

	test(`skips an aria/ candidate when the same accessible name resolves for more than one element`, () => {
		const first = document.createElement(`button`);
		first.setAttribute(`aria-label`, `Close`);
		const second = document.createElement(`button`);
		second.setAttribute(`aria-label`, `Close`);
		document.body.appendChild(first);
		document.body.appendChild(second);

		first.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect((steps[0] as ClickStep).selectors).not.toContain(`aria/Close`);
	});
});

// ─── flush timing ─────────────────────────────────────────────────────────────
// A click (or change) that triggers an immediate navigation tears down the renderer's JS
// context — including the buffered-but-unflushed step and the pending interval — before the
// 2s timer ever fires, silently dropping the step. These tests guard against that regressing.

describe(`flush timing`, () => {
	test(`flushes a click step immediately, without waiting for the 2s interval or the 50-step threshold`, () => {
		const btn = document.createElement(`button`);
		document.body.appendChild(btn);

		btn.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));

		expect(flush()).toHaveLength(1);
	});

	test(`flushes a change step immediately for the same reason`, () => {
		const input = document.createElement(`input`);
		document.body.appendChild(input);

		input.dispatchEvent(new Event(`change`, { bubbles: true }));

		expect(flush()).toHaveLength(1);
	});

	test(`still batches keyDown/keyUp/scroll on the interval/count path, not immediately`, () => {
		const input = document.createElement(`input`);
		document.body.appendChild(input);

		input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `a`, bubbles: true }));

		expect(flush()).toHaveLength(0);

		vi.advanceTimersByTime(2000);
		expect(flush()).toHaveLength(1);
	});

	test(`flushes any buffered (not-yet-interval-flushed) steps when beforeunload fires`, () => {
		const input = document.createElement(`input`);
		document.body.appendChild(input);

		input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `a`, bubbles: true }));
		expect(flush()).toHaveLength(0);

		window.dispatchEvent(new Event(`beforeunload`));

		expect(flush()).toHaveLength(1);
	});

	test(`reproduces the original bug scenario: a click immediately followed by beforeunload does not lose the click step`, () => {
		const link = document.createElement(`a`);
		document.body.appendChild(link);

		link.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		window.dispatchEvent(new Event(`beforeunload`));

		const steps = flush();
		expect(steps).toHaveLength(1);
		expect(steps[0].type).toBe(`click`);
	});
});

// ─── keydown cursor capture ───────────────────────────────────────────────────

describe(`keydown cursor position capture`, () => {
	test(`captures selectionStart/selectionEnd on keydown for a focused text input`, () => {
		const input = document.createElement(`input`);
		input.type = `text`;
		document.body.appendChild(input);
		input.value = `hello`;
		input.setSelectionRange(3, 3);

		input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `x`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect(steps).toHaveLength(1);
		expect((steps[0] as KeyDownStep).selectionStart).toBe(3);
		expect((steps[0] as KeyDownStep).selectionEnd).toBe(3);
	});

	test(`omits selectionStart/selectionEnd for non-text-editable elements (e.g. buttons)`, () => {
		const btn = document.createElement(`button`);
		document.body.appendChild(btn);

		btn.dispatchEvent(new KeyboardEvent(`keydown`, { key: `Enter`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect(steps).toHaveLength(1);
		expect((steps[0] as KeyDownStep).selectionStart).toBeUndefined();
		expect((steps[0] as KeyDownStep).selectionEnd).toBeUndefined();
	});
});

// ─── sensitive fields ─────────────────────────────────────────────────────────

describe(`sensitive field exclusion`, () => {
	test(`does not emit an InputStep for <input type="password"> fields`, () => {
		const input = document.createElement(`input`);
		input.type = `password`;
		document.body.appendChild(input);

		input.value = `secret`;
		input.dispatchEvent(new Event(`change`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		expect(flush()).toHaveLength(0);
	});

	test(`does not buffer keyDown/keyUp steps for keystrokes inside a password field`, () => {
		const input = document.createElement(`input`);
		input.type = `password`;
		document.body.appendChild(input);

		input.dispatchEvent(new KeyboardEvent(`keydown`, { key: `a`, bubbles: true }));
		input.dispatchEvent(new KeyboardEvent(`keyup`, { key: `a`, bubbles: true }));
		vi.advanceTimersByTime(2000);

		expect(flush()).toHaveLength(0);
	});

	test(`does not buffer any step for interactions on elements with [data-eyas-no-record] or its descendants`, () => {
		const wrapper = document.createElement(`div`);
		wrapper.setAttribute(`data-eyas-no-record`, ``);
		const btn = document.createElement(`button`);
		wrapper.appendChild(btn);
		document.body.appendChild(wrapper);

		btn.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		expect(flush()).toHaveLength(0);
	});
});

// ─── iframe frame-path ─────────────────────────────────────────────────────────

describe(`iframe frame-path capture`, () => {
	test(`does not set a frame path when running in the top window`, () => {
		const btn = document.createElement(`button`);
		document.body.appendChild(btn);

		btn.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush() as ClickStep[];
		expect(steps[0].frame).toBeUndefined();
	});
});

// ─── scroll throttling ─────────────────────────────────────────────────────────

describe(`scroll throttling`, () => {
	test(`buffers only one ScrollStep per 200ms window on trailing edge when scroll events fire rapidly`, () => {
		document.dispatchEvent(new Event(`scroll`, { bubbles: true }));
		vi.advanceTimersByTime(50);
		document.dispatchEvent(new Event(`scroll`, { bubbles: true }));
		vi.advanceTimersByTime(50);
		document.dispatchEvent(new Event(`scroll`, { bubbles: true }));

		vi.advanceTimersByTime(2000);

		const steps = flush().filter(s => s.type === `scroll`);
		expect(steps).toHaveLength(1);
	});

	test(`captures the final window.scrollX / window.scrollY position at time of emission`, () => {
		Object.defineProperty(window, `scrollX`, { value: 42, configurable: true });
		Object.defineProperty(window, `scrollY`, { value: 84, configurable: true });

		document.dispatchEvent(new Event(`scroll`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush().filter(s => s.type === `scroll`) as ScrollStep[];
		expect(steps[0]).toMatchObject({ x: 42, y: 84 });
	});
});

// ─── buffer flush ─────────────────────────────────────────────────────────────

describe(`buffer flush`, () => {
	test(`sends recorder-flush-steps and clears the buffer every 2 seconds when the buffer is non-empty`, () => {
		const btn = document.createElement(`button`);
		document.body.appendChild(btn);

		btn.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);
		expect(flush()).toHaveLength(1);

		send.mockClear();
		btn.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);
		expect(flush()).toHaveLength(1);
	});

	test(`sends recorder-flush-steps immediately once the buffer reaches 50 steps`, () => {
		const btn = document.createElement(`button`);
		document.body.appendChild(btn);

		for (let i = 0; i < 50; i++) {
			btn.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		}

		expect(flush()).toHaveLength(50);
	});

	test(`sends no IPC message when the buffer is empty at the flush interval`, () => {
		vi.advanceTimersByTime(2000);
		expect(send).not.toHaveBeenCalled();
	});
});

// ─── popup id tagging ───────────────────────────────────────────────────────────
// popupId is no longer stamped by this preload — a popup's injected window global doesn't
// reliably survive its first navigation, so the main process tags popupId on arrival instead,
// keyed off which webContents the flush IPC came from (see ipc-handlers.recorder.test.ts).

describe(`popup id tagging`, () => {
	test(`never sets popupId on steps at capture time, regardless of window context — tagging happens in the main process on flush arrival`, () => {
		const btn = document.createElement(`button`);
		document.body.appendChild(btn);

		btn.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush() as ClickStep[];
		expect(steps[0].popupId).toBeUndefined();
	});
});
