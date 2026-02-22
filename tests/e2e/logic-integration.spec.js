const { test, expect } = require(`@playwright/test`);
const {
	launchEyas,
	exitEyas,
	emitIpcMessage,
	getAppWindowUrl,
	waitForMenuUpdate
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
			const networkMenu = m.find(item => item.label.includes(`Network`));
			return networkMenu && networkMenu.label.includes(`🚫`);
		});

		expect(menu.find(item => item.label.includes(`Network`)).label).toContain(`🚫`);

		// Toggle back
		await emitIpcMessage(electronApp, `network-status`, true);
		const menuOnline = await waitForMenuUpdate(electronApp, m => {
			const networkMenu = m.find(item => item.label.includes(`Network`));
			return networkMenu && networkMenu.label.includes(`📶`);
		});

		expect(menuOnline.find(item => item.label.includes(`Network`)).label).toContain(`📶`);
	});

	test(`test server setup via IPC starts the server`, async () => {
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
			const tools = m.find(item => item.label.includes(`Tools`));
			return tools && tools.submenu && tools.submenu.some(item => item.label.includes(`Test Server running`));
		});

		const tools = menu.find(item => item.label.includes(`Tools`));
		const testServerItem = tools.submenu.find(item => item.label.includes(`Test Server running`));
		expect(testServerItem.label).toMatch(/Test Server running/);
	});
});
