// @vitest-environment happy-dom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import type { RecordingStep, ClickStep, ScrollStep, KeyDownStep } from '@registry/recording.js';

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
		const events = [`click`, `change`, `keydown`, `keyup`, `scroll`];
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
		expect((steps[0] as ClickStep).selectors.primary).toBe(`#save`);
	});
});

// ─── selector priority ────────────────────────────────────────────────────────

describe(`selector priority order`, () => {
	test(`prefers [data-testid] as SelectorGroup.primary when present`, () => {
		const el = document.createElement(`button`);
		el.setAttribute(`data-testid`, `submit-btn`);
		el.id = `should-not-win`;
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect((steps[0] as ClickStep).selectors.primary).toBe(`[data-testid="submit-btn"]`);
	});

	test(`falls back to [data-qa] as primary when data-testid is absent`, () => {
		const el = document.createElement(`button`);
		el.setAttribute(`data-qa`, `submit-btn`);
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect((steps[0] as ClickStep).selectors.primary).toBe(`[data-qa="submit-btn"]`);
	});

	test(`falls back to [aria-label] as primary for interactive elements when data-testid/data-qa are absent`, () => {
		const el = document.createElement(`button`);
		el.setAttribute(`aria-label`, `Submit form`);
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect((steps[0] as ClickStep).selectors.primary).toBe(`[aria-label="Submit form"]`);
	});

	test(`falls back to #id as primary last, to avoid dynamic/auto-generated IDs when other priority selectors exist`, () => {
		const el = document.createElement(`button`);
		el.id = `submit-btn`;
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect((steps[0] as ClickStep).selectors.primary).toBe(`#submit-btn`);
	});

	test(`always populates fallbacks with CSS class path (own classes only) and full nth-child ancestor path, in that order`, () => {
		const el = document.createElement(`button`);
		el.id = `submit-btn`;
		el.className = `btn btn-primary`;
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		const fallbacks = (steps[0] as ClickStep).selectors.fallbacks;
		expect(fallbacks).toContain(`.btn.btn-primary`);
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
