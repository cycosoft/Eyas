import type { MenuItemConstructorOptions } from 'electron';
import { describe, test, expect } from 'vitest';
import { buildMenuTemplate } from '@core/menu-template.js';
import type { MenuContext } from '@registry/menu.js';

const noop = (): void => { };

const minimalContext: MenuContext = {
	isDev: false,
	testNetworkEnabled: true,
	quit: noop,
	navigateHome: noop,
	reload: noop,
	back: noop,
	forward: noop,
	toggleNetwork: noop
};

// ─── Root-level structure ──────────────────────────────────────────────────

describe(`Root menu structure`, () => {
	test(`template has exactly 1 top-level item`, () => {
		const template = buildMenuTemplate(minimalContext);
		expect(template.length).toBe(1);
	});

	test(`root menu is Development Tools`, () => {
		const template = buildMenuTemplate(minimalContext);
		expect(template[0].label).toContain(`Development Tools`);
	});
});

// ─── Tools menu ───────────────────────────────────────────────────────────

describe(`Development Tools menu`, () => {
	test(`Development Tools menu exists as first root item`, () => {
		const template = buildMenuTemplate(minimalContext);
		const toolsMenu = template[0] as MenuItemConstructorOptions;
		expect(toolsMenu).toBeDefined();
		expect(toolsMenu.label).toContain(`Development Tools`);
		expect(Array.isArray(toolsMenu.submenu)).toBe(true);
	});

	test(`Development Tools submenu does NOT contain Copy URL`, () => {
		const template = buildMenuTemplate(minimalContext);
		const toolsMenu = template[0] as MenuItemConstructorOptions;
		const item = (toolsMenu.submenu as MenuItemConstructorOptions[]).find(i => i.label && i.label.toLowerCase().includes(`copy url`));
		expect(item).toBeUndefined();
	});

	test(`Tools submenu contains Go Online/Offline toggle with toggleNetwork handler`, () => {
		const toggleNetwork = (): void => { };
		const ctx = { ...minimalContext, toggleNetwork };
		const template = buildMenuTemplate(ctx as MenuContext);
		const toolsMenu = template[0] as MenuItemConstructorOptions;
		const item = (toolsMenu.submenu as MenuItemConstructorOptions[]).find(i => i.label && (i.label.toLowerCase().includes(`online`) || i.label.toLowerCase().includes(`offline`)));
		if (!item) throw new Error();
		expect(item).toBeDefined();
		expect(item.click).toBe(toggleNetwork);
	});

	test(`when isInitializing is true, Development Tools menu is disabled`, () => {
		const ctx = { ...minimalContext, isInitializing: true };
		const template = buildMenuTemplate(ctx as MenuContext);
		const toolsMenu = template[0] as MenuItemConstructorOptions;
		expect(toolsMenu.enabled).toBe(false);
	});
});
