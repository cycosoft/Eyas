import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from '@playwright/test';
import { buildEditableTextProbeScript } from '@core/session-playback.selector-resolution.js';
import type { SelectorGroup } from '@registry/recording.js';
import type { VariableValue } from '@registry/primitives.js';

// The page-side half of the contenteditable assertion: a pure read. Everything about *judging* what
// it returns lives in session-playback.assertions.test.ts, which needs no browser.
//
// Runs against real Chromium rather than happy-dom because innerText is layout-aware — its line
// breaks come from rendered boxes, not markup, and that's precisely the property being read here.
describe(`contenteditable text probe`, () => {
	let browser: Browser;
	let page: Page;

	beforeAll(async () => {
		browser = await chromium.launch();
		page = await browser.newPage();
	});

	afterAll(async () => {
		await browser?.close();
	});

	function probe(candidates: SelectorGroup): Promise<VariableValue | null> {
		return page.evaluate(buildEditableTextProbeScript(candidates));
	}

	const EDITOR = `<div data-testid="editor" contenteditable="true">`;

	test(`reads the editor's current text`, async () => {
		await page.setContent(`${EDITOR}Rich text</div>`);

		expect(await probe([`testid/editor`])).toBe(`Rich text`);
	});

	test(`reads text through markup rather than the markup itself`, async () => {
		await page.setContent(`${EDITOR}Rich <b>text</b></div>`);

		expect(await probe([`testid/editor`])).toBe(`Rich text`);
	});

	test(`reports rendered line breaks, so a lost paragraph is visible to the caller`, async () => {
		await page.setContent(`${EDITOR}<div>Line 1</div><div>Line 2</div></div>`);

		// the assertion's whole value in this case rests on innerText distinguishing this from
		// "Line 1 Line 2" — a textContent read would flatten them and silently pass
		expect(await probe([`testid/editor`])).toBe(`Line 1\nLine 2`);
	});

	test(`leaves the page untouched`, async () => {
		await page.setContent(`${EDITOR}Rich <b>text</b></div>`);

		await probe([`testid/editor`]);

		// the point of the inversion: whatever the app under test produced is still there afterward
		expect(await page.locator(`[data-testid="editor"]`).innerHTML()).toBe(`Rich <b>text</b>`);
	});

	test(`falls through to the next candidate when the first doesn't resolve`, async () => {
		await page.setContent(`${EDITOR}Rich text</div>`);

		// the realistic ordering: a content-derived candidate captured before the drift no longer
		// matches, and the stable one behind it is what resolves
		expect(await probe([`aria/Some name`, `testid/editor`])).toBe(`Rich text`);
	});

	test(`returns null when no candidate resolves, rather than throwing`, async () => {
		await page.setContent(`${EDITOR}Rich text</div>`);

		// null is a distinct finding from wrong text — see checkEditableText
		expect(await probe([`testid/gone`])).toBeNull();
	});
});
