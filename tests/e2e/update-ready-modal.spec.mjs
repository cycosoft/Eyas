import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getUiView,
	ensureEnvironmentSelected,
	emitIpcToRenderer
} from './eyas-utils.mjs';

test.describe(`Update Ready Modal`, () => {
	let electronApp;
	let uiPage;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
		uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);
		// wait for any modals/overlays to fully fade out
		await uiPage.waitForTimeout(1000);
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`clicking update button in downloaded state shows modal`, async () => {
		// simulate downloaded state
		await emitIpcToRenderer(electronApp, `update-status-updated`, `downloaded`);

		// click the update button (broadcast button)
		const updateBtn = uiPage.locator(`[data-qa="btn-broadcast"]`);
		await expect(updateBtn).toBeVisible();
		await updateBtn.click();

		// verify modal is visible
		const modalText = uiPage.locator(`[data-qa="update-ready-modal-text"]`);
		await expect(modalText).toBeVisible({ timeout: 5000 });
		await expect(modalText).toContainText(`ready to install`);

		// click "Later"
		const laterBtn = uiPage.locator(`[data-qa="btn-update-later"]`);
		await laterBtn.click();

		// verify modal is hidden
		await expect(modalText).not.toBeVisible();
	});

	test(`clicking "Update Eyas Now" closes the app`, async () => {
		// simulate downloaded state
		await emitIpcToRenderer(electronApp, `update-status-updated`, `downloaded`);

		// click the update button
		const updateBtn = uiPage.locator(`[data-qa="btn-broadcast"]`);
		await updateBtn.click();

		// click "Update Eyas Now"
		const updateNowBtn = uiPage.locator(`[data-qa="btn-update-now"]`);
		await expect(updateNowBtn).toBeVisible();

		// We expect the app to attempt to close/restart.
		// Since we're in a test environment and autoUpdater.quitAndInstall() is called,
		// the app will exit.
		await updateNowBtn.click();

		// verify the app closes by waiting for the electronApp to be closed
		// we use a longer timeout here because quitAndInstall might take a moment
		await expect(async () => {
			const isClosed = await electronApp.evaluate(() => false).catch(() => true);
			expect(isClosed).toBe(true);
		}).toPass({ timeout: 10000 });
	});
});
