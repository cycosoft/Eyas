import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	emitIpcToRenderer,
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

		// 1. Initially the Links button should NOT be visible (empty config)
		await emitIpcToRenderer(electronApp, `navigation-state-updated`, {
			canGoBack: false,
			canGoForward: false,
			links: []
		});
		const linksBtn = uiPage.locator(`[data-qa="btn-nav-group-links"]`);
		await expect(linksBtn).not.toBeVisible();

		// 2. Send links via IPC
		const links = [
			{ title: `Google`, value: `launch-link:{"url":"https://google.com/","external":true}` },
			{ title: `Variable`, value: `launch-link-var:https://example.com/{myvar}` }
		];
		await emitIpcToRenderer(electronApp, `navigation-state-updated`, {
			canGoBack: false,
			canGoForward: false,
			links
		});

		// 3. Links button should now be visible
		await expect(linksBtn).toBeVisible();
		await expect(linksBtn).toContainText(`Links`);

		// 4. Click the Links button to open the menu
		await linksBtn.click();

		// 5. Check if menu items are visible
		const menuItems = uiPage.locator(`[data-qa="btn-nav-item"]`);
		await expect(menuItems).toHaveCount(2);
		await expect(menuItems.nth(0)).toContainText(`Google`);
		await expect(menuItems.nth(1)).toContainText(`Variable`);
	});
});
