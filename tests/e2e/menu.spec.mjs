import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getMenuStructure
} from './eyas-utils.mjs';

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

		expect(labels.length).toBeGreaterThanOrEqual(4);
		expect(labels.some(l => l.match(/Eyas|File/i))).toBe(true);
		expect(labels.some(l => l.includes(`Test`))).toBe(true);
		expect(labels.some(l => l.includes(`Browser`))).toBe(true);
		expect(labels.some(l => l.includes(`Tools`))).toBe(true);
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
