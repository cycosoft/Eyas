const { test, expect } = require(`@playwright/test`);
const {
	launchEyas,
	getUiView,
	ensureEnvironmentSelected,
	exitEyas,
	getMenuStructure,
	clickSubMenuItem,
	waitForMenuUpdate
} = require(`./eyas-utils`);

test.describe(`Application Menu`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`application menu has expected top-level items`, async () => {
		const menuStructure = await getMenuStructure(electronApp);
		const labels = menuStructure.map(item => item.label);

		expect(labels.length).toBeGreaterThanOrEqual(5);
		expect(labels.some(l => l.match(/Eyas|File/i))).toBe(true);
		expect(labels.some(l => l.includes(`Tools`))).toBe(true);
		expect(labels.some(l => l.includes(`Network`))).toBe(true);
		expect(labels.some(l => l.includes(`Cache`))).toBe(true);
		expect(labels.some(l => l.includes(`Viewport`))).toBe(true);
	});

	test(`app-name menu has About and Exit`, async () => {
		const menuStructure = await getMenuStructure(electronApp);
		const appMenu = menuStructure.find(m => m.submenu && m.submenu.some(si => si.label.includes(`About`)));
		expect(appMenu).toBeDefined();

		const submenuLabels = appMenu.submenu.map(item => item.label);
		expect(submenuLabels.some(l => l.includes(`About`))).toBe(true);
		expect(submenuLabels.some(l => l.includes(`Exit`))).toBe(true);
	});

	test(`functional menus are disabled until environment selection`, async () => {
		const ui = await getUiView(electronApp);

		// Check initial disabled state
		const menuInitial = await getMenuStructure(electronApp);
		const tools = menuInitial.find(item => item.label.includes(`Tools`));
		expect(tools.enabled).toBe(false);

		// Select environment
		await ensureEnvironmentSelected(ui);

		// Wait for menus to enable
		const menuAfter = await waitForMenuUpdate(electronApp, m => {
			const t = m.find(item => item.label.includes(`Tools`));
			return t && t.enabled;
		});

		expect(menuAfter.find(item => item.label.includes(`Network`)).enabled).toBe(true);
		expect(menuAfter.find(item => item.label.includes(`Cache`)).enabled).toBe(true);
	});

	test(`Live Test Server menu flow works correctly`, async () => {
		const ui = await getUiView(electronApp);

		// Clear initial Environment Modal
		await ensureEnvironmentSelected(ui);

		// 1. Click menu item, modal appears
		await clickSubMenuItem(electronApp, `Tools`, `Live Test Server`);
		const modalTitle = ui.locator(`[data-qa="test-server-setup-title"]`);
		await expect(modalTitle).toBeVisible();

		// 2. Click cancel, modal disappears
		await ui.locator(`[data-qa="btn-cancel-test-server"]`).click();
		await expect(modalTitle).not.toBeVisible();

		// 3. Click continue, server starts
		await clickSubMenuItem(electronApp, `Tools`, `Live Test Server`);
		await ui.locator(`[data-qa="btn-continue-test-server"]`).click();
		await expect(modalTitle).not.toBeVisible();

		// Wait for menu to update with time remaining
		const menuTestServer = await waitForMenuUpdate(electronApp, m => {
			const tools = m.find(item => item.label.includes(`Tools`));
			return tools && tools.submenu && tools.submenu.some(item => item.label.includes(`Test Server running`));
		});

		const tools = menuTestServer.find(item => item.label.includes(`Tools`));
		const testServerItem = tools.submenu.find(item => item.label.includes(`Test Server running`));
		expect(testServerItem.label).toMatch(/Test Server running for ~\d+[smh]/);
	});
});
