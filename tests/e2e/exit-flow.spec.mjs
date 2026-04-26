import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getUiView,
	clickSubMenuItem,
	ensureEnvironmentSelected,
	getUiLayerHeight
} from './eyas-utils.mjs';

test.describe(`Exit Flow`, () => {
	let electronApp;
	let uiPage;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
		uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`native 'Exit' menu item shows confirmation modal`, async () => {
		// trigger native exit
		await clickSubMenuItem(electronApp, `Eyas`, `Exit`);

		// check if the exit modal is visible in the UI
		const exitModalText = uiPage.locator(`[data-qa="exit-modal-text"]`);
		await expect(exitModalText).toBeVisible({ timeout: 5000 });
		await expect(exitModalText).toContainText(`Would you like to exit the test?`);
	});

	test(`UI 'Exit' menu item shows confirmation modal`, async () => {
		// Open the File menu in the UI
		const fileMenu = uiPage.locator(`[data-qa="btn-nav-group-file"]`);
		await fileMenu.click();

		// Find and click the Exit item
		const exitItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Exit` });
		await exitItem.click();

		// check if the exit modal is visible in the UI
		const exitModalText = uiPage.locator(`[data-qa="exit-modal-text"]`);
		await expect(exitModalText).toBeVisible({ timeout: 5000 });
		await expect(exitModalText).toContainText(`Would you like to exit the test?`);

		// verify the UI layer is still expanded (height > 48)
		// we wait a bit to ensure delayedClose would have fired (600ms)
		await new Promise(resolve => setTimeout(resolve, 1000));
		const height = await getUiLayerHeight(electronApp);
		expect(height).toBeGreaterThan(48);
	});
});
