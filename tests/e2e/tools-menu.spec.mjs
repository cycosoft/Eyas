import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getUiView,
	ensureEnvironmentSelected
} from './eyas-utils.mjs';

test.describe(`Tools Menu Interaction`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`clicking 'Live Test Server' in the Tools menu opens the Test Server Setup modal`, async () => {
		const uiPage = await getUiView(electronApp);

		// 0. Ensure environment is selected (clears initial modal)
		await ensureEnvironmentSelected(uiPage);

		// 1. Click the 'Tools' menu
		const toolsMenuBtn = uiPage.locator(`[data-qa="btn-nav-group-tools"]`);
		await expect(toolsMenuBtn).toBeVisible({ timeout: 10000 });
		await toolsMenuBtn.click();

		// 2. Find and click the 'Live Test Server' item
		const testServerItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Live Test Server` });
		await expect(testServerItem).toBeVisible({ timeout: 5000 });
		await testServerItem.click();

		// 3. Verify the Test Server Setup modal opens
		const setupModalTitle = uiPage.locator(`[data-qa="test-server-setup-title"]`);
		await expect(setupModalTitle).toBeVisible({ timeout: 10000 });
	});

	test(`the Tools menu contains Viewport and Cache items`, async () => {
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		const toolsMenuBtn = uiPage.locator(`[data-qa="btn-nav-group-tools"]`);
		await toolsMenuBtn.click();

		const viewportItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Viewport` });
		const cacheItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Cache` });

		await expect(viewportItem).toBeVisible();
		await expect(cacheItem).toBeVisible();
	});

	test(`the Tools menu contains DevTools items`, async () => {
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		const toolsMenuBtn = uiPage.locator(`[data-qa="btn-nav-group-tools"]`);
		await toolsMenuBtn.click();

		const devToolsUiItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Developer Tools (UI)` });
		const devToolsTestItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Developer Tools (Test)` });

		await expect(devToolsUiItem).toBeVisible();
		await expect(devToolsTestItem).toBeVisible();
	});
});
