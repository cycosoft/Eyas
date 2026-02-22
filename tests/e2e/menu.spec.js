const { test, expect } = require(`@playwright/test`);
const {
	launchEyas,
	exitEyas,
	getMenuStructure
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
});
