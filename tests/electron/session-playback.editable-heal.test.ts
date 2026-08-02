import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from '@playwright/test';
import { buildEditableHealScript } from '@core/session-playback.selector-resolution.js';
import type { SelectorGroup, EditableChangeStep } from '@registry/recording.js';
import type { Count } from '@registry/primitives.js';

// The replay half of the contenteditable self-healing corrector — the counterpart to
// _dispatchChange's value guard, for an editor that has no `.value` and fires no `change`.
//
// Runs against real Chromium rather than happy-dom: the heal depends on innerText's layout-aware
// semantics and on real Range/Selection behavior for the caret restore, neither of which a DOM
// shim reproduces faithfully enough to trust here.
describe(`contenteditable heal`, () => {
	let browser: Browser;
	let page: Page;

	beforeAll(async () => {
		browser = await chromium.launch();
		page = await browser.newPage();
	});

	afterAll(async () => {
		await browser?.close();
	});

	function heal(candidates: SelectorGroup, text: EditableChangeStep[`text`]): Promise<void> {
		return page.evaluate(buildEditableHealScript(candidates, text));
	}

	const EDITOR = `<div data-testid="editor" contenteditable="true">`;

	test(`snaps a drifted editor back to the recorded text`, async () => {
		await page.setContent(`${EDITOR}Rch txt</div>`);

		await heal([`testid/editor`], `Rich text`);

		expect(await page.locator(`[data-testid="editor"]`).innerText()).toBe(`Rich text`);
	});

	test(`leaves an already-correct editor entirely alone, preserving its markup`, async () => {
		await page.setContent(`${EDITOR}Rich <b>text</b></div>`);

		await heal([`testid/editor`], `Rich text`);

		// the drift guard is what makes the corrector safe to run unconditionally: an exact text match
		// means per-keystroke replay already got there, and flattening the toolbar's <b> would be a
		// regression the corrector introduced rather than a repair
		expect(await page.locator(`[data-testid="editor"]`).innerHTML()).toBe(`Rich <b>text</b>`);
	});

	// counts into an attribute on the editor rather than a window global, so nothing has to be
	// declared on the page's type surface. Setting an attribute fires no further input event.
	async function countInputEvents(): Promise<void> {
		await page.evaluate(() => {
			const el = document.querySelector(`[data-testid="editor"]`);
			el?.setAttribute(`data-input-count`, `0`);
			el?.addEventListener(`input`, () => {
				el.setAttribute(`data-input-count`, String(Number(el.getAttribute(`data-input-count`)) + 1));
			});
		});
	}

	async function inputEventCount(): Promise<Count> {
		return Number(await page.locator(`[data-testid="editor"]`).getAttribute(`data-input-count`));
	}

	test(`fires input so a listening editor picks the heal up`, async () => {
		await page.setContent(`${EDITOR}drift</div>`);
		await countInputEvents();

		await heal([`testid/editor`], `Rich text`);

		expect(await inputEventCount()).toBe(1);
	});

	test(`fires no input when nothing needed repairing`, async () => {
		await page.setContent(`${EDITOR}Rich text</div>`);
		await countInputEvents();

		await heal([`testid/editor`], `Rich text`);

		expect(await inputEventCount()).toBe(0);
	});

	test(`leaves the caret at the end of the editor, so later keystrokes append`, async () => {
		await page.setContent(`${EDITOR}drift</div>`);
		await page.locator(`[data-testid="editor"]`).focus();

		await heal([`testid/editor`], `Rich text`);
		// a contenteditable keystroke carries no recorded cursor position, so replay types into
		// whatever caret the heal leaves behind — assigning textContent collapses it to the start,
		// which would make every keystroke after a mid-session heal insert at the top of the editor
		await page.keyboard.type(`!`);

		expect(await page.locator(`[data-testid="editor"]`).innerText()).toBe(`Rich text!`);
	});

	test(`falls through to the next candidate when the first doesn't resolve`, async () => {
		await page.setContent(`${EDITOR}drift</div>`);

		// the realistic ordering: a content-derived candidate captured before the drift no longer
		// matches, and the stable one behind it is what saves the heal
		await heal([`aria/Rich text`, `testid/editor`], `Rich text`);

		expect(await page.locator(`[data-testid="editor"]`).innerText()).toBe(`Rich text`);
	});

	test(`does nothing when no candidate resolves, rather than throwing and failing the replay`, async () => {
		await page.setContent(`${EDITOR}drift</div>`);

		await expect(heal([`testid/gone`], `Rich text`)).resolves.toBeUndefined();
		expect(await page.locator(`[data-testid="editor"]`).innerText()).toBe(`drift`);
	});
});
