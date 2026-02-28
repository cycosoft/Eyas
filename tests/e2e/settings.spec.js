const { test, expect } = require(`@playwright/test`);
const {
	launchEyas,
	exitEyas,
	getMenuStructure,
	clickSubMenuItem,
	getUiView
} = require(`./eyas-utils`);

test.describe(`User Settings`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`Settings menu item exists in the Eyas menu`, async () => {
		const menuStructure = await getMenuStructure(electronApp);
		const appMenu = menuStructure.find(m => m.submenu && m.submenu.some(si => si.label.includes(`About`)));
		expect(appMenu).toBeDefined();

		const settingsItem = appMenu.submenu.find(item => item.label.includes(`Settings`));
		expect(settingsItem).toBeDefined();
		expect(settingsItem.label).toContain(`Settings`);
	});

	test(`clicking Settings opens the Settings modal`, async () => {
		const uiPage = await getUiView(electronApp);

		// Optional: log renderer console to help debugging
		uiPage.on(`console`, msg => console.log(`RENDERER: ${msg.text()}`));

		// Open the settings modal from the menu
		await clickSubMenuItem(electronApp, `Eyas`, `Settings`);

		const settingsModalTitle = uiPage.locator(`[data-qa="settings-modal-title"]`);

		// Wait for visibility
		await expect(settingsModalTitle).toBeVisible({ timeout: 10000 });
		await expect(settingsModalTitle).toHaveText(`Settings`);

		// Close it
		await uiPage.locator(`[data-qa="settings-close"]`).click();
		await expect(settingsModalTitle).not.toBeVisible();
	});

	test(`Always choose checkbox preserves selection on next launch`, async () => {
		let uiPage = await getUiView(electronApp);
		uiPage.on(`console`, msg => console.log(`RENDERER: ${msg.text()}`));

		const envModalTitle = uiPage.locator(`[data-qa="environment-modal-title"]`);
		await expect(envModalTitle).toBeVisible();

		// Check the "Always choose" checkbox (corrected data-qa)
		const alwaysChooseCheckbox = uiPage.locator(`[data-qa="checkbox-always-choose"] input`);
		await alwaysChooseCheckbox.check();

		// Select the first environment
		const firstEnvBtn = uiPage.locator(`[data-qa="btn-env"]`).first();
		await firstEnvBtn.click();

		// Wait for both visibility to go away and navigation to finish
		await expect(envModalTitle).not.toBeVisible();
		await new Promise(resolve => setTimeout(resolve, 2000));

		// Restart Eyas
		await exitEyas(electronApp);
		electronApp = await launchEyas();
		uiPage = await getUiView(electronApp);
		uiPage.on(`console`, msg => console.log(`RENDERER (launch 2): ${msg.text()}`));

		const envModalTitle2 = uiPage.locator(`[data-qa="environment-modal-title"]`);

		// Wait and ensure it DOES NOT appear
		await new Promise(resolve => setTimeout(resolve, 3000));
		expect(await envModalTitle2.isVisible()).toBe(false);
	});
});
