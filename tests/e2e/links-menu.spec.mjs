import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getUiView,
	ensureEnvironmentSelected
} from './eyas-utils.mjs';

test.describe(`Links Menu`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`displays the links menu when links are provided`, async () => {
		const uiPage = await getUiView(electronApp);

		// Clear environment modal if it appears
		await ensureEnvironmentSelected(uiPage);

		const linksBtn = uiPage.locator(`[data-qa="btn-nav-group-links"]`);

		// Wait for initial demo configuration links to render to ensure startup has fully settled
		await expect(linksBtn).toBeVisible({ timeout: 10000 });

		// Click the Links button to open the menu
		await linksBtn.click();

		// Check if menu items are visible and match the real config links
		const menuItems = uiPage.locator(`[data-qa="btn-nav-item"]`);
		await expect(menuItems).toHaveCount(6);
		await expect(menuItems.nth(0)).toContainText(`Eyas Home`);
		await expect(menuItems.nth(1)).toContainText(`Environments Demo`);
	});
});
