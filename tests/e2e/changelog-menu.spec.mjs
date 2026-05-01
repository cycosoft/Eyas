import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getUiView,
	ensureEnvironmentSelected
} from './eyas-utils.mjs';

test.describe(`Header Menu Interaction - Changelog`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`clicking 'Changelog' in the File menu opens the Changelog modal`, async () => {
		const uiPage = await getUiView(electronApp);

		// 0. Ensure environment is selected (clears initial modal)
		await ensureEnvironmentSelected(uiPage);

		// 1. Click the 'File' menu
		const fileMenuBtn = uiPage.locator(`[data-qa="btn-nav-group-file"]`);
		await expect(fileMenuBtn).toBeVisible({ timeout: 10000 });
		await fileMenuBtn.click();

		// 2. Find and click the 'Changelog' item
		const changelogMenuItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Changelog` });
		await expect(changelogMenuItem).toBeVisible({ timeout: 5000 });
		await changelogMenuItem.click();

		// 3. Verify the changelog modal opens with the correct title
		const changelogModal = uiPage.locator(`[data-qa="whats-new-modal"]`);
		await expect(changelogModal).toBeVisible({ timeout: 10000 });

		const modalTitle = changelogModal.locator(`.v-card-title`);
		await expect(modalTitle).toHaveText(`Changelog`);
	});
});
