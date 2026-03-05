const { test, expect } = require(`@playwright/test`);
const {
	launchEyas,
	exitEyas,
	clickSubMenuItem,
	getUiView
} = require(`./eyas-utils`);

test.describe(`Restart Test`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`"Tools > Restart Test" always displays the environment chooser`, async () => {
		const uiPage = await getUiView(electronApp);

		// 1. Persist an environment choice with "Always choose"
		const envModalTitle = uiPage.locator(`[data-qa="environment-modal-title"]`);
		await expect(envModalTitle).toBeVisible();

		// Check the "Always choose" checkbox
		const alwaysChooseCheckbox = uiPage.locator(`[data-qa="checkbox-always-choose"] input`);
		await alwaysChooseCheckbox.check();

		// Select an environment
		const firstEnvBtn = uiPage.locator(`[data-qa="btn-env"]`).first();
		await firstEnvBtn.click();

		// Wait for modal to disappear
		await expect(envModalTitle).not.toBeVisible();

		// 2. Trigger "Tools > Restart Test" from the menu
		// This should show the modal again despite "Always choose" being set
		const restartTriggered = await clickSubMenuItem(electronApp, `Tools`, `Restart Test`);
		expect(restartTriggered).toBe(true);

		// 3. Verify the environment modal is visible again
		await expect(envModalTitle).toBeVisible({ timeout: 10000 });
	});
});
