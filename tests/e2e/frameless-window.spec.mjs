import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getUiView,
	ensureEnvironmentSelected
} from './eyas-utils.mjs';

test.describe(`Frameless Window WCO Support`, () => {
	let electronApp;
	let uiPage;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
		uiPage = await getUiView(electronApp);
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`should enable Window Controls Overlay with correct configuration in main window`, async () => {
		// Clear environment selection so we get to the main page
		await ensureEnvironmentSelected(uiPage);

		// Verify Window Controls Overlay configuration on the BrowserWindow in main process
		const config = await electronApp.evaluate(({ BrowserWindow }) => {
			const win = BrowserWindow.getAllWindows()[0];
			return win._titleBarOverlayConfig;
		});

		expect(config).toEqual({
			color: `#f7f9fb`,
			symbolColor: `#191c1e`,
			height: 30
		});
	});

	test(`should position main application wrap below system bar`, async () => {
		// Clear environment selection so we get to the main page
		await ensureEnvironmentSelected(uiPage);

		const rect = await uiPage.evaluate(() => {
			const el = document.querySelector(`.v-application__wrap`);
			const r = el.getBoundingClientRect();
			return { top: r.top };
		});
		expect(rect.top).toBe(30);
	});
});
