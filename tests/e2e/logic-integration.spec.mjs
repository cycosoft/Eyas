import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	emitIpcMessage,
	getAppWindowUrl,
	getUiView
} from './eyas-utils.mjs';

test.describe(`Logic-Driven Integration Tests`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`environment selection via IPC updates application URL`, async () => {
		// Simulate selecting the 'Staging' environment (index 2 in .eyas.config.js domains)
		const targetUrl = `staging.eyas.cycosoft.com`;
		await emitIpcMessage(electronApp, `environment-selected`, targetUrl);

		// Verify the window navigated to the staging URL (might be wrapped in eyas:// protocol)
		// We poll a bit to allow navigation to happen
		let currentUrl = ``;
		for (let i = 0; i < 10; i++) {
			currentUrl = await getAppWindowUrl(electronApp);
			if (currentUrl.includes(targetUrl)) break;
			await new Promise(resolve => setTimeout(resolve, 500));
		}

		expect(currentUrl).toContain(targetUrl);
	});

	test(`network toggle via IPC updates UI state`, async () => {
		const uiPage = await getUiView(electronApp);

		// Initial state is true in index.js, so the badge should display 'Online'
		const statusChip = uiPage.locator(`[data-qa="omni-hub-status"]`);
		await expect(statusChip).toContainText(`Online`);

		// Disable network via IPC
		await emitIpcMessage(electronApp, `network-status`, false);

		// Verify status chip updates to reflect offline status
		await expect(statusChip).toContainText(`Offline`);

		// Toggle back
		await emitIpcMessage(electronApp, `network-status`, true);
		await expect(statusChip).toContainText(`Online`);
	});

	test(`test server setup via IPC starts the server`, async () => {
		// Clear environment modal using IPC
		await emitIpcMessage(electronApp, `environment-selected`, `staging.eyas.cycosoft.com`);

		// Wait for the UI to digest the environment selection
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Emit the 'Continue' message for the test server setup
		// This bypasses the setup modal logic entirely
		await emitIpcMessage(electronApp, `test-server-setup-continue`, {
			useHttps: false,
			autoOpenBrowser: false,
			useCustomDomain: false
		});

		// Verify the new modal is presented to the user
		const uiPage = await getUiView(electronApp);

		// Wait for the modal title to be visible indicating it opened
		const modalTitle = uiPage.getByText(`End Session`);
		try {
			await expect(modalTitle).toBeVisible({ timeout: 15000 });
		} catch (e) {
			await uiPage.screenshot({ path: `test-error.png` });
			throw e;
		}

		// Verify the session action button is present
		const endSessionBtn = uiPage.getByText(`End Session`);
		await expect(endSessionBtn).toBeVisible();

		// Click the End Session button to stop the server
		await endSessionBtn.click();

		// Wait for the modal to be hidden
		await expect(modalTitle).not.toBeVisible();
	});
});
