import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getUiView,
	getUiLayerBounds,
	getTestLayerBounds,
	getAppWindowContentSize,
	ensureEnvironmentSelected,
	EYAS_HEADER_HEIGHT
} from './eyas-utils.mjs';

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

	test(`UI layer and Test layer dimensions must strictly adhere to decoupling rules`, async () => {
		// 1. Clear the environment modal if it's visible
		await ensureEnvironmentSelected(uiPage);

		// 2. Validate initial COLLAPSED state dimensions:
		// - UI Layer width should equal actual window content width
		// - UI Layer height should equal EYAS_HEADER_HEIGHT (78)
		// - Test Layer dimensions should equal canonical viewport (1024x768)
		await expect.poll(async () => {
			const [windowWidth] = await getAppWindowContentSize(electronApp);
			const uiBounds = await getUiLayerBounds(electronApp);
			const testBounds = await getTestLayerBounds(electronApp);

			return (
				uiBounds.width === windowWidth &&
				uiBounds.height === EYAS_HEADER_HEIGHT &&
				testBounds.width === 1024 &&
				testBounds.height === 768
			);
		}, {
			message: `Initial collapsed layer dimensions are incorrect`,
			timeout: 10000
		}).toBe(true);

		// 3. Click a menu button to expand the UI
		const fileMenuBtn = uiPage.locator(`[data-qa="btn-nav-group-file"]`);
		await expect(fileMenuBtn).toBeVisible();
		await fileMenuBtn.click();

		// 4. Validate EXPANDED state dimensions:
		// - UI Layer width should equal actual window content width
		// - UI Layer height should equal actual window content height (modal covers full window)
		// - Test Layer dimensions should remain at canonical viewport (1024x768)
		await expect.poll(async () => {
			const [windowWidth, windowHeight] = await getAppWindowContentSize(electronApp);
			const uiBounds = await getUiLayerBounds(electronApp);
			const testBounds = await getTestLayerBounds(electronApp);

			return (
				uiBounds.width === windowWidth &&
				uiBounds.height === windowHeight &&
				testBounds.width === 1024 &&
				testBounds.height === 768
			);
		}, {
			message: `Expanded state layer dimensions are incorrect`,
			timeout: 5000
		}).toBe(true);

		// 5. Resize the window and verify that both layers track the resize correctly:
		// - UI Layer must stretch to match the new window width and height
		// - Test Layer must ignore the DPI-rounding scale drift and retain canonical 1024x768
		const [oldWidth, oldHeight] = await getAppWindowContentSize(electronApp);
		const newWidth = oldWidth + 100;
		const newHeight = oldHeight + 100;

		await electronApp.evaluate(({ BrowserWindow }, { newWidth, newHeight }) => {
			const win = BrowserWindow.getAllWindows()[0];
			win.setContentSize(newWidth, newHeight);
		}, { newWidth, newHeight });

		await expect.poll(async () => {
			const [windowWidth, windowHeight] = await getAppWindowContentSize(electronApp);
			const uiBounds = await getUiLayerBounds(electronApp);
			const testBounds = await getTestLayerBounds(electronApp);

			return (
				uiBounds.width === windowWidth &&
				uiBounds.height === windowHeight &&
				testBounds.width === windowWidth &&
				testBounds.height === windowHeight - EYAS_HEADER_HEIGHT &&
				Math.abs(windowHeight - newHeight) <= 5 // allow for OS rounding threshold
			);
		}, {
			message: `Resized state layer dimensions did not align with decoupling rules`,
			timeout: 5000
		}).toBe(true);
	});
});
