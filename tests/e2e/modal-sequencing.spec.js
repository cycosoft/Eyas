const { test, expect } = require(`@playwright/test`);
const { launchEyas, exitEyas, getUiView } = require(`./eyas-utils`);
const fs = require(`fs-extra`);
const path = require(`path`);

test.describe(`Modal Sequencing`, () => {
	let electronApp;
	let uiPage;
	const userDataDir = path.join(__dirname, `..`, `.test-user-data-sequencing`);
	const settingsPath = path.join(userDataDir, `settings.json`);

	test.beforeEach(async () => {
		// Ensure a clean test environment
		await fs.remove(userDataDir);
		await fs.ensureDir(userDataDir);

		// Create a settings file with an OLD version to trigger What's New
		const settings = {
			app: {
				lastSeenVersion: `0.1.0`
			},
			projects: {}
		};
		await fs.outputJson(settingsPath, settings);
	});

	test.afterEach(async () => {
		if (electronApp) {
			await exitEyas(electronApp);
		}
		// cleanup
		await fs.remove(userDataDir);
	});

	test(`should show Whats New first, then Environment Chooser`, async () => {
		// Launch Eyas with the custom user data dir and EXPLICITLY show whats new
		electronApp = await launchEyas([`--show-whats-new`], userDataDir);
		uiPage = await getUiView(electronApp);

		// 1. Verify "What's New" title is visible
		// Using regex for flexibility
		const whatsNewTitle = uiPage.locator(`[data-qa="whats-new-modal"]`).locator(`.v-card-title`);
		await expect(whatsNewTitle).toHaveText(/What's New$/i);
		await whatsNewTitle.waitFor({ state: `visible`, timeout: 20000 });

		// 2. Verify Environment Modal is NOT visible yet
		const envModal = uiPage.locator(`[data-qa="environment-modal-title"]`);
		await expect(envModal).not.toBeVisible();

		// 3. Close What's New
		await uiPage.locator(`[data-qa="whats-new-modal"]`).locator(`text=Got it!`).click();
		await whatsNewTitle.waitFor({ state: `hidden`, timeout: 10000 });

		// 4. Verify Environment Modal appears automatically
		await expect(envModal).toBeVisible({ timeout: 10000 });
	});
});
