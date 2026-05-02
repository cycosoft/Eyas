import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getUiView,
	getUiLayerHeight,
	getAppWindowContentSize,
	ensureEnvironmentSelected
} from './eyas-utils.mjs';

const EYAS_HEADER_HEIGHT = 48;

test.describe(`UI Layer Expansion`, () => {
	let electronApp;
	let uiPage;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
		uiPage = await getUiView(electronApp);
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`UI layer should expand to full window height when a menu is opened`, async () => {
		// 1. Clear the environment modal if it's visible
		await ensureEnvironmentSelected(uiPage);

		// 2. Check initial height (should be header height when no modals are open)
		await expect.poll(async () => await getUiLayerHeight(electronApp), {
			message: `UI layer did not collapse to header height after environment selection`,
			timeout: 5000
		}).toBe(EYAS_HEADER_HEIGHT);

		// 3. Click a menu button to expand the UI
		const fileMenuBtn = uiPage.locator(`[data-qa="btn-nav-group-file"]`);
		await expect(fileMenuBtn).toBeVisible();
		await fileMenuBtn.click();

		// 3. Verify the UI layer height matches the full window content height
		await expect.poll(async () => {
			const currentHeight = await getUiLayerHeight(electronApp);
			const [, windowHeight] = await getAppWindowContentSize(electronApp);
			return currentHeight === windowHeight;
		}, {
			message: `UI layer did not expand to full window height`,
			timeout: 5000
		}).toBe(true);

		// 4. Resize the window and verify the UI layer resizes with it
		const [oldWidth, oldHeight] = await getAppWindowContentSize(electronApp);
		const newWidth = oldWidth + 100;
		const newHeight = oldHeight + 100;

		await electronApp.evaluate(({ BrowserWindow }, { newWidth, newHeight }) => {
			const win = BrowserWindow.getAllWindows()[0];
			win.setContentSize(newWidth, newHeight);
		}, { newWidth, newHeight });

		await expect.poll(async () => {
			const currentHeight = await getUiLayerHeight(electronApp);
			const [, windowHeight] = await getAppWindowContentSize(electronApp);
			return currentHeight === windowHeight && windowHeight === newHeight;
		}, {
			message: `UI layer did not resize with window while expanded`,
			timeout: 5000
		}).toBe(true);
	});
});
