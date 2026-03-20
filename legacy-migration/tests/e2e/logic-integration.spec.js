const { test, expect } = require(`@playwright/test`);
const {
	launchEyas,
	exitEyas,
	emitIpcMessage,
	getAppWindowUrl,
	waitForMenuUpdate,
	getUiView
} = require(`./eyas-utils`);

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

	test(`network toggle via IPC updates menu state`, async () => {
		// Initial state is true in index.js
		await emitIpcMessage(electronApp, `network-status`, false);

		// Verify menu updates to reflect offline status
		const menu = await waitForMenuUpdate(electronApp, m => {
			const devTools = m.find(item => item.label.includes(`Developer Tools`));
			return devTools && devTools.submenu && devTools.submenu.some(item => item.label.includes(`&Go Online`));
		});

		const devTools = menu.find(item => item.label.includes(`Developer Tools`));
		const toggleItem = devTools.submenu.find(item => item.label.includes(`&Go Online`));
		expect(toggleItem).toBeDefined();

		// Toggle back
		await emitIpcMessage(electronApp, `network-status`, true);
		const menuOnline = await waitForMenuUpdate(electronApp, m => {
			const devTools = m.find(item => item.label.includes(`Developer Tools`));
			return devTools && devTools.submenu && devTools.submenu.some(item => item.label.includes(`&Go Offline`));
		});

		const toggleItemOnline = menuOnline.find(item => item.label.includes(`Developer Tools`)).submenu.find(item => item.label.includes(`&Go Offline`));
		expect(toggleItemOnline).toBeDefined();
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

		// Verify the menu shows the test server is running
		// The interval for menu updates in index.js is 60s, but setMenu is called immediately after start
		const menu = await waitForMenuUpdate(electronApp, m => {
			const testMenu = m.find(item => item.label.includes(`Test`));
			return testMenu && testMenu.submenu && testMenu.submenu.some(item => item.label.includes(`Live Test Server`) && !item.enabled);
		});

		const testMenu = menu.find(item => item.label.includes(`Test`));
		const testServerItem = testMenu.submenu.find(item => item.label.includes(`Live Test Server`));
		expect(testServerItem.enabled).toBe(false);

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

		// Verify the menu clears out the "Test Server running" entry
		const updatedMenu = await waitForMenuUpdate(electronApp, m => {
			const mTestMenu = m.find(item => item.label.includes(`Test`));
			if (!mTestMenu || !mTestMenu.submenu) return true;
			return mTestMenu.submenu.some(item => item.label.includes(`Live Test Server`) && item.enabled);
		});

		const finalTestMenu = updatedMenu.find(item => item.label.includes(`Test`));
		const runningItem = finalTestMenu.submenu.find(item => item.label.includes(`Live Test Server`));
		expect(runningItem.enabled).toBe(true);
	});
});
