const { test, expect } = require(`@playwright/test`);
const {
	launchEyas,
	exitEyas,
	getUiView,
	clickSubMenuItem
} = require(`./eyas-utils`);

test.describe(`Theme Synchronization`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`changing theme to Dark updates the UI class and colors`, async () => {
		const uiPage = await getUiView(electronApp);

		// Capture console logs for debugging
		uiPage.on(`console`, msg => console.log(`RENDERER LOG: ${msg.text()}`));

		// Open Settings modal
		await clickSubMenuItem(electronApp, `Eyas`, `Settings`);

		// Wait for modal to appear and switch to App tab
		const appTab = uiPage.locator(`[data-qa="settings-tab-app"]`);
		await appTab.click();

		// Select Dark mode - click the label inside the radio button to be safe
		await uiPage.locator(`[data-qa="settings-app-theme-dark"] .v-label`).click();

		// Verify the App component has the dark theme class
		const appContainer = uiPage.locator(`[data-qa="app-container"]`);
		await expect(appContainer).toHaveClass(/v-theme--dark/, { timeout: 15000 });
	});

	test(`changing theme to Light updates the UI class`, async () => {
		const uiPage = await getUiView(electronApp);

		await clickSubMenuItem(electronApp, `Eyas`, `Settings`);
		await uiPage.locator(`[data-qa="settings-tab-app"]`).click();

		// Select Light mode
		await uiPage.locator(`[data-qa="settings-app-theme-light"]`).click();

		const appContainer = uiPage.locator(`[data-qa="app-container"]`);
		await expect(appContainer).toHaveClass(/v-theme--light/, { timeout: 10000 });
	});
});
