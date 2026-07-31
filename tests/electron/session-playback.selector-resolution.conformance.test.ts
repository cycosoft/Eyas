import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from '@playwright/test';
import { buildClickPointScript } from '@core/session-playback.selector-resolution.js';
import type { SelectorGroup, ClickPoint } from '@registry/recording.js';

// Proves the in-app resolver (session-playback.selector-resolution.ts) agrees with real
// Playwright's own locator resolution on the same DOM + candidate list — the concrete answer to
// "won't our resolver diverge from real e2e frameworks", per Phase 3 of the portable-locators plan.
// Runs against a real Chromium page (not jsdom/node) since the resolver script relies on real
// layout (getBoundingClientRect/getClientRects/elementFromPoint).
describe(`selector-resolution conformance vs. real Playwright`, () => {
	let browser: Browser;
	let page: Page;

	beforeAll(async () => {
		browser = await chromium.launch();
		page = await browser.newPage();
	});

	afterAll(async () => {
		await browser?.close();
	});

	async function _resolveViaOurScript(candidates: SelectorGroup): Promise<ClickPoint | null> {
		return page.evaluate(buildClickPointScript(candidates));
	}

	async function _expectSamePointAsPlaywrightLocator(candidates: SelectorGroup, playwrightLocator: ReturnType<Page[`getByTestId`]>): Promise<void> {
		const ourPoint = await _resolveViaOurScript(candidates);
		const box = await playwrightLocator.boundingBox();

		expect(ourPoint).not.toBeNull();
		expect(box).not.toBeNull();
		if (!ourPoint || !box) { return; }

		expect(ourPoint.x).toBeGreaterThanOrEqual(box.x);
		expect(ourPoint.x).toBeLessThanOrEqual(box.x + box.width);
		expect(ourPoint.y).toBeGreaterThanOrEqual(box.y);
		expect(ourPoint.y).toBeLessThanOrEqual(box.y + box.height);
	}

	test(`resolves an aria/<name> candidate to the same element Playwright's getByRole(name) resolves`, async () => {
		await page.setContent(`<button aria-label="Save changes">x</button>`);

		await _expectSamePointAsPlaywrightLocator([`aria/Save changes`], page.getByRole(`button`, { name: `Save changes` }));
	});

	test(`resolves a text/<content> candidate to the same element Playwright's getByText resolves`, async () => {
		await page.setContent(`<div><span>Continue to checkout</span></div>`);

		await _expectSamePointAsPlaywrightLocator([`text/Continue to checkout`], page.getByText(`Continue to checkout`, { exact: true }));
	});

	test(`resolves a testid/<value> candidate to the same element Playwright's getByTestId resolves`, async () => {
		await page.setContent(`<div data-testid="submit-btn">Submit</div>`);

		await _expectSamePointAsPlaywrightLocator([`testid/submit-btn`], page.getByTestId(`submit-btn`));
	});

	test(`resolves a plain CSS candidate to the same element Playwright's page.locator(css) resolves`, async () => {
		await page.setContent(`<div id="readme"><a href="#">link text</a></div>`);

		await _expectSamePointAsPlaywrightLocator([`#readme > a`], page.locator(`#readme > a`));
	});

	test(`falls through to the next candidate when an earlier one doesn't resolve, agreeing with the candidate that does`, async () => {
		await page.setContent(`<button data-testid="confirm-btn">Confirm</button>`);

		await _expectSamePointAsPlaywrightLocator([`aria/Nonexistent name`, `text/Nonexistent text`, `testid/confirm-btn`], page.getByTestId(`confirm-btn`));
	});

	test(`resolves an associated <label> element the same way Playwright's getByLabel resolves the input`, async () => {
		await page.setContent(`<label for="email">Email address</label><input id="email" type="text" />`);

		await _expectSamePointAsPlaywrightLocator([`aria/Email address`], page.getByLabel(`Email address`));
	});
});
