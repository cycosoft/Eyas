import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getUiView,
	ensureEnvironmentSelected
} from './eyas-utils.mjs';

test.describe(`Navigation History`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`back button should be disabled immediately after environment selection`, async () => {
		const uiPage = await getUiView(electronApp);

		// 1. Choose an environment (clears initial modal)
		await ensureEnvironmentSelected(uiPage);

		// 2. Check if the back button is disabled
		const backBtn = uiPage.locator(`[data-qa="btn-browser-back"]`);

		// Wait for the button to be visible
		await expect(backBtn).toBeVisible({ timeout: 10000 });

		// It should be disabled because we just started the test
		// Give it a moment to receive any potentially incorrect state updates
		await uiPage.waitForTimeout(2000);
		await expect(backBtn).toBeDisabled();
	});
});
