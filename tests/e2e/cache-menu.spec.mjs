import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getUiView,
	ensureEnvironmentSelected
} from './eyas-utils.mjs';

test.describe(`Cache Menu Interaction`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`the 'Cache' item in the Tools menu has a submenu with Age, Size, and Clear items`, async () => {
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		// 1. Click the 'Tools' menu
		const toolsMenuBtn = uiPage.locator(`[data-qa="btn-nav-group-tools"]`);
		await expect(toolsMenuBtn).toBeVisible({ timeout: 10000 });
		await toolsMenuBtn.click();

		// 2. Find the 'Cache' item and hover to see submenu
		const cacheItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Cache` });
		await expect(cacheItem).toBeVisible({ timeout: 5000 });

		// Hover to trigger submenu
		await cacheItem.hover();

		// 3. Verify the submenu items are visible
		// We expect items starting with "Age:", "Size:", and "Clear"
		const ageItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: /Age:/ });
		const sizeItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: /Size:/ });
		const clearItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Clear` });

		// These should fail currently
		await expect(ageItem).toBeVisible({ timeout: 5000 });
		await expect(sizeItem).toBeVisible({ timeout: 5000 });
		await expect(clearItem).toBeVisible({ timeout: 5000 });

		// 4. Verify Age and Size are non-actionable (default cursor and no pointer events)
		await expect(ageItem).toHaveCSS(`cursor`, `default`);
		await expect(ageItem).toHaveCSS(`pointer-events`, `none`);
		await expect(sizeItem).toHaveCSS(`cursor`, `default`);
		await expect(sizeItem).toHaveCSS(`pointer-events`, `none`);
	});

	test(`clicking 'Clear' in the Cache submenu clears the cache`, async () => {
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		// 1. Click 'Tools'
		const toolsMenuBtn = uiPage.locator(`[data-qa="btn-nav-group-tools"]`);
		await toolsMenuBtn.click();

		// 2. Hover 'Cache'
		const cacheItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Cache` });
		await cacheItem.hover();

		// 3. Verify size is present
		const sizeItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: /Size:/ });
		await expect(sizeItem).toBeVisible();

		// 4. Click 'Clear'
		const clearItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Clear` });
		await clearItem.click();

		// 5. Menu should close. Reopen to check size.
		// Wait for menu to close and state to update
		await uiPage.waitForTimeout(1000);

		await toolsMenuBtn.click();
		await cacheItem.hover();

		// 6. Verify size is updated (should be 0 or very small)
		// Note: Electron might not report exactly 0 immediately, but it should be much smaller or 0.
		await expect(sizeItem).toHaveText(/Size: 0 Bytes/);
	});
});
