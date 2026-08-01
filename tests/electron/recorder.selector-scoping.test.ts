// @vitest-environment happy-dom
import { describe, test, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import type { RecordingStep, ClickStep } from '@registry/recording.js';

const send = vi.fn();

vi.mock(`electron`, () => ({
	ipcRenderer: { send }
}));

function flush(): RecordingStep[] {
	const calls = send.mock.calls.filter(call => call[0] === `recorder-flush-steps`);
	return calls.flatMap(call => call[1] as RecordingStep[]);
}

// same real-preload-lifecycle rationale as recorder.test.ts: imported once for the whole file
// under fake timers, since the preload registers its listeners/interval at import time
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
	vi.advanceTimersByTime(2000);
});

// Reproduces GitHub's file-browser table: every row renders the same link twice (once per
// responsive breakpoint), so a name/text match alone is never unique — but the two duplicates sit
// under sibling cells with different classes, and no *other* row shares those classes while also
// containing that name, so scoping to the nearest such ancestor recovers a stable, non-positional
// candidate instead of falling all the way to a fragile nth-child path.
describe(`ancestor-scoped aria/text candidates`, () => {
	function buildDuplicateRowTable(): void {
		const table = document.createElement(`table`);
		for (const [id, name] of [[`row-1`, `demo`], [`row-2`, `other`]] as const) {
			const row = document.createElement(`tr`);
			row.id = id;
			for (const cellClass of [`cell-small`, `cell-large`]) {
				const cell = document.createElement(`td`);
				cell.className = cellClass;
				const link = document.createElement(`a`);
				link.setAttribute(`aria-label`, name);
				link.textContent = name;
				cell.appendChild(link);
				row.appendChild(cell);
			}
			table.appendChild(row);
		}
		document.body.appendChild(table);
	}

	test(`falls back to a scoped-aria/ candidate, qualified by the nearest ancestor that disambiguates, when the accessible name is duplicated`, () => {
		buildDuplicateRowTable();
		const demoLargeLink = document.querySelector(`tr#row-1 td.cell-large a`) as HTMLElement;

		demoLargeLink.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		const candidates = (steps[0] as ClickStep).selectors;
		const scopedCandidate = candidates.find(c => c.indexOf(`scoped-aria/`) === 0);
		expect(scopedCandidate).toBeTruthy();
		expect(candidates).not.toContain(`aria/demo`);

		const payload = scopedCandidate ? JSON.parse(scopedCandidate.slice(`scoped-aria/`.length)) : null;
		expect(payload).toEqual({ scope: `td.cell-large`, name: `demo` });
	});

	test(`does not add a scoped-aria/ candidate when no ancestor (up to document.body) ever disambiguates the duplicated name`, () => {
		const first = document.createElement(`div`);
		const firstButton = document.createElement(`button`);
		firstButton.setAttribute(`aria-label`, `Close`);
		first.appendChild(firstButton);
		const second = document.createElement(`div`);
		const secondButton = document.createElement(`button`);
		secondButton.setAttribute(`aria-label`, `Close`);
		second.appendChild(secondButton);
		document.body.appendChild(first);
		document.body.appendChild(second);

		firstButton.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		const candidates = (steps[0] as ClickStep).selectors;
		expect(candidates.some(c => c.indexOf(`scoped-aria/`) === 0)).toBe(false);
	});
});

describe(`href candidates`, () => {
	test(`includes an href/ candidate for an anchor element, alongside its accessible-name candidate`, () => {
		const link = document.createElement(`a`);
		link.setAttribute(`href`, `/cycosoft/Eyas/tree/main/demo`);
		link.setAttribute(`aria-label`, `Unique demo link`);
		document.body.appendChild(link);

		link.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		const candidates = (steps[0] as ClickStep).selectors;
		expect(candidates).toContain(`href//cycosoft/Eyas/tree/main/demo`);
	});

	test(`does not include an href/ candidate for a non-anchor element`, () => {
		const btn = document.createElement(`button`);
		btn.setAttribute(`href`, `/should-be-ignored`);
		document.body.appendChild(btn);

		btn.dispatchEvent(new MouseEvent(`click`, { bubbles: true }));
		vi.advanceTimersByTime(2000);

		const steps = flush();
		const candidates = (steps[0] as ClickStep).selectors;
		expect(candidates.some(c => c.indexOf(`href/`) === 0)).toBe(false);
	});
});
