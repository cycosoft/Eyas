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

		expect(labels.length).toBe(3);
		expect(labels.some(l => l.includes(`Test`))).toBe(true);
		expect(labels.some(l => l.includes(`Browser`))).toBe(true);
		expect(labels.some(l => l.includes(`Tools`))).toBe(true);
	});

	test(`'Development Tools' menu does NOT have Developer Tools items`, async () => {
		const menuStructure = await getMenuStructure(electronApp);
		const toolsMenu = menuStructure.find(m => m.label.includes(`Tools`));
		expect(toolsMenu).toBeDefined();

		const submenuLabels = toolsMenu.submenu.map(item => item.label);
		expect(submenuLabels.some(l => l.includes(`Developer Tools`))).toBe(false);
	});
});

