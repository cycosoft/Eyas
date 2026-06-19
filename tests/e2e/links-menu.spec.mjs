import { test, expect } from '@playwright/test';
import path from 'path';
import { pathToFileURL } from 'url';
import {
	launchEyas,
	exitEyas,
	getUiView,
	ensureEnvironmentSelected
} from './eyas-utils.mjs';

test.describe(`Links Menu`, () => {
	let electronApp;
	let config;

	test.beforeAll(async () => {
		const configPath = pathToFileURL(path.resolve(process.cwd(), `.eyas.config.js`)).href;
		// eslint-disable-next-line no-restricted-syntax -- E2E test runs in Node where @root alias is not resolved; dynamic import is required to load configuration
		config = (await import(configPath)).default;
	});

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

		// Check if menu items are visible and match the real config links dynamically
		const menuItems = uiPage.locator(`[data-qa="btn-nav-item"]`);
		const expectedLinks = config.links || [];

		await expect(menuItems).toHaveCount(expectedLinks.length);

		for (let i = 0; i < expectedLinks.length; i++) {
			await expect(menuItems.nth(i)).toContainText(expectedLinks[i].label);
		}
	});
});
