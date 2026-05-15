import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getUiView,
	ensureEnvironmentSelected
} from './eyas-utils.mjs';

test.describe(`Header Menu Interaction`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`clicking 'App/Project Settings' in the File menu opens the Settings modal`, async () => {
		const uiPage = await getUiView(electronApp);

		// 0. Ensure environment is selected (clears initial modal)
		await ensureEnvironmentSelected(uiPage);

		// 1. Click the 'File' menu (which uses the logo)
		const fileMenuBtn = uiPage.locator(`[data-qa="btn-nav-group-file"]`);
		await expect(fileMenuBtn).toBeVisible({ timeout: 10000 });
		await fileMenuBtn.click();

		// 2. Find and click the 'App/Project Settings' item
		const settingsMenuItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `App/Project Settings` });
		await expect(settingsMenuItem).toBeVisible({ timeout: 5000 });
		await settingsMenuItem.click();

		// 3. Verify the settings modal opens
		const settingsTabProject = uiPage.locator(`[data-qa="settings-tab-project"]`);
		await expect(settingsTabProject).toBeVisible({ timeout: 10000 });
		await expect(settingsTabProject).toHaveText(`Project`);
	});
});
