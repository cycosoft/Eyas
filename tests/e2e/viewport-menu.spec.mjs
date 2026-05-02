import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getUiView,
	ensureEnvironmentSelected,
	getAppWindowContentSize
} from './eyas-utils.mjs';

test.describe(`Viewport Menu Interaction`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`hovering/clicking 'Viewport' in the Tools menu shows a submenu with viewports`, async () => {
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		// 1. Click the 'Tools' menu
		const toolsMenuBtn = uiPage.locator(`[data-qa="btn-nav-group-tools"]`);
		await toolsMenuBtn.click();

		// 2. Find the 'Viewport' item
		const viewportItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Viewport` });
		await expect(viewportItem).toBeVisible();

		// 3. Hover Viewport and check for submenu
		await viewportItem.hover();

		// 4. Assert that default viewports (Desktop, Tablet, Mobile) are visible
		// This will likely fail currently as there is no submenu implementation.
		const desktopItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Desktop` });
		const tabletItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Tablet` });
		const mobileItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Mobile` });

		await expect(desktopItem).toBeVisible({ timeout: 5000 });
		await expect(tabletItem).toBeVisible();
		await expect(mobileItem).toBeVisible();
	});

	test(`clicking a viewport item resizes the application window`, async () => {
		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		// 1. Click the 'Tools' menu
		const toolsMenuBtn = uiPage.locator(`[data-qa="btn-nav-group-tools"]`);
		const initialSize = await getAppWindowContentSize(electronApp);
		await toolsMenuBtn.click();

		// 2. Hover the 'Viewport' item to open submenu
		const viewportItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Viewport` });
		await viewportItem.hover();

		// 3. Click the 'Mobile' viewport (360 x 640)
		// We use a more specific selector and wait for it to be visible
		const mobileItem = uiPage.locator(`.v-menu .v-list-item`, { hasText: `Mobile` });
		await expect(mobileItem).toBeVisible({ timeout: 5000 });
		await mobileItem.click();

		// 4. Verify the window size
		// Note: The content size will be 360x640.
		// The actual window size will be slightly larger due to the header (48px).
		await expect.poll(async () => {
			const size = await getAppWindowContentSize(electronApp);
			return size;
		}, { timeout: 10000 }).toEqual([360, 688]);
	});
});
