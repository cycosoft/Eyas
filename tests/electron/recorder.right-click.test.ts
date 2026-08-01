// @vitest-environment happy-dom
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import type { RecordingStep, ClickStep } from '@registry/recording.js';

// Split out of recorder.test.ts, which is at its max-lines ceiling.
//
// A right-click is recorded as a ClickStep carrying the Chrome DevTools Recorder `secondary`
// button rather than as a new step type, so a session stays valid against the W3C recorder
// schema and older readers still see a well-formed click.

const send = vi.fn();
const addEventListenerCalls: unknown[][] = [];

vi.mock(`electron`, () => ({
	ipcRenderer: { send }
}));

function flush(): RecordingStep[] {
	return send.mock.calls
		.filter(call => call[0] === `recorder-flush-steps`)
		.flatMap(call => call[1] as RecordingStep[]);
}

// The recorder preload registers its listeners/interval once at import time (real preload
// lifecycle), so it's imported exactly once for the whole file — see recorder.test.ts.
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
	// drain anything buffered-but-unflushed so it can't leak into the next test
	vi.advanceTimersByTime(2000);
});

describe(`right-click capture`, () => {
	test(`registers the contextmenu listener with { capture: true }, like every other recorded event`, () => {
		expect(addEventListenerCalls).toContainEqual([`contextmenu`, expect.any(Function), { capture: true }]);
	});

	test(`captures a contextmenu event as a ClickStep tagged button: secondary`, () => {
		const el = document.createElement(`div`);
		el.id = `grid-row`;
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`contextmenu`, { bubbles: true, clientX: 40, clientY: 60 }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		expect(steps).toHaveLength(1);
		expect(steps[0]).toMatchObject({ type: `click`, button: `secondary`, offsetX: 40, offsetY: 60 });
		expect((steps[0] as ClickStep).selectors[0]).toBe(`#grid-row`);
	});

	test(`omits button entirely for a left click, so sessions match those recorded before right-click capture`, () => {
		const btn = document.createElement(`button`);
		btn.id = `save`;
		document.body.appendChild(btn);

		btn.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		expect(flush()[0]).not.toHaveProperty(`button`);
	});

	test(`records exactly one step for a right-click, since Blink fires no click alongside contextmenu`, () => {
		const el = document.createElement(`div`);
		el.id = `grid-row`;
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`contextmenu`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		expect(flush()).toHaveLength(1);
	});

	test(`honours data-eyas-no-record on right-click the same way it does on left-click`, () => {
		const el = document.createElement(`div`);
		el.setAttribute(`data-eyas-no-record`, ``);
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`contextmenu`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		expect(flush()).toHaveLength(0);
	});

	test(`flushes a right-click immediately, since a context menu action can navigate in the same tick`, () => {
		const el = document.createElement(`div`);
		el.id = `grid-row`;
		document.body.appendChild(el);

		el.dispatchEvent(new MouseEvent(`contextmenu`, { bubbles: true }));

		// no timer advance — the IPC send must already have happened
		expect(flush()).toHaveLength(1);
	});
});
