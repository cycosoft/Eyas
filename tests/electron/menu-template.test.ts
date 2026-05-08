import type { MenuItemConstructorOptions } from 'electron';
import { describe, test, expect } from 'vitest';
import { buildMenuTemplate } from '@core/menu-template.js';
import type { MenuContext } from '@registry/menu.js';

const noop = (): void => { };

const minimalContext: MenuContext = {
	isDev: false,
	testNetworkEnabled: true,
	quit: noop,
	copyUrl: noop,
	navigateHome: noop,
	reload: noop,
	back: noop,
	forward: noop,
	toggleNetwork: noop
};

// ─── Root-level structure ──────────────────────────────────────────────────

describe(`Root menu structure`, () => {


	test(`template has multiple top-level items`, () => {
		const template = buildMenuTemplate(minimalContext);
		expect(template.length).toBeGreaterThan(1);
	});

	test(`root menus are in order: Browser, Development Tools`, () => {
		const template = buildMenuTemplate(minimalContext);
		expect(template[0].label).toContain(`Browser`);
		expect(template[1].label).toContain(`Development Tools`);
	});
});



// ─── Browser menu ─────────────────────────────────────────────────────────

describe(`Browser menu`, () => {
	test(`Browser menu exists as first root item`, () => {
		const template = buildMenuTemplate(minimalContext);
		const browserMenu = template[0] as MenuItemConstructorOptions;
		expect(browserMenu).toBeDefined();
		expect(browserMenu.label).toContain(`Browser`);
		expect(Array.isArray(browserMenu.submenu)).toBe(true);
	});

	test(`Browser submenu contains Copy URL with copyUrl handler`, () => {
		const copyUrl = (): void => { };
		const ctx = { ...minimalContext, copyUrl };
		const template = buildMenuTemplate(ctx as MenuContext);
		const browserMenu = template[0] as MenuItemConstructorOptions;
		const item = (browserMenu.submenu as MenuItemConstructorOptions[]).find(i => i.label && i.label.toLowerCase().includes(`copy url`));
		if (!item) throw new Error();
		expect(item).toBeDefined();
		expect(item.click).toBe(copyUrl);
	});

	test(`Browser submenu does NOT contain Reload`, () => {
		const template = buildMenuTemplate(minimalContext);
		const browserMenu = template[0] as MenuItemConstructorOptions;
		const item = (browserMenu.submenu as MenuItemConstructorOptions[]).find(i => i.label && i.label.toLowerCase().includes(`reload`));
		expect(item).toBeUndefined();
	});

	test(`Browser submenu does NOT contain Back`, () => {
		const template = buildMenuTemplate(minimalContext);
		const browserMenu = template[0] as MenuItemConstructorOptions;
		const item = (browserMenu.submenu as MenuItemConstructorOptions[]).find(i => i.label && i.label.toLowerCase().includes(`back`));
		expect(item).toBeUndefined();
	});

	test(`Browser submenu does NOT contain Forward`, () => {
		const template = buildMenuTemplate(minimalContext);
		const browserMenu = template[0] as MenuItemConstructorOptions;
		const item = (browserMenu.submenu as MenuItemConstructorOptions[]).find(i => i.label && i.label.toLowerCase().includes(`forward`));
		expect(item).toBeUndefined();
	});

	test(`Browser submenu does NOT contain Go Online/Offline toggle`, () => {
		const template = buildMenuTemplate(minimalContext);
		const browserMenu = template[0] as MenuItemConstructorOptions;
		const item = (browserMenu.submenu as MenuItemConstructorOptions[]).find(i => i.label && (i.label.toLowerCase().includes(`online`) || i.label.toLowerCase().includes(`offline`)));
		expect(item).toBeUndefined();
	});


	test(`when isInitializing is true, Browser menu is disabled`, () => {
		const ctx = { ...minimalContext, isInitializing: true };
		const template = buildMenuTemplate(ctx as MenuContext);
		const browserMenu = template[0] as MenuItemConstructorOptions;
		expect(browserMenu.enabled).toBe(false);
	});
});

// ─── Tools menu ───────────────────────────────────────────────────────────

describe(`Development Tools menu`, () => {
	test(`Development Tools menu exists as second root item`, () => {
		const template = buildMenuTemplate(minimalContext);
		const toolsMenu = template[1] as MenuItemConstructorOptions;
		expect(toolsMenu).toBeDefined();
		expect(toolsMenu.label).toContain(`Development Tools`);
		expect(Array.isArray(toolsMenu.submenu)).toBe(true);
	});

	test(`Development Tools submenu does NOT contain Copy URL`, () => {
		const template = buildMenuTemplate(minimalContext);
		const toolsMenu = template[1] as MenuItemConstructorOptions;
		const item = (toolsMenu.submenu as MenuItemConstructorOptions[]).find(i => i.label && i.label.toLowerCase().includes(`copy url`));
		expect(item).toBeUndefined();
	});

	test(`Tools submenu contains Go Online/Offline toggle with toggleNetwork handler`, () => {
		const toggleNetwork = (): void => { };
		const ctx = { ...minimalContext, toggleNetwork };
		const template = buildMenuTemplate(ctx as MenuContext);
		const toolsMenu = template[1] as MenuItemConstructorOptions;
		const item = (toolsMenu.submenu as MenuItemConstructorOptions[]).find(i => i.label && (i.label.toLowerCase().includes(`online`) || i.label.toLowerCase().includes(`offline`)));
		if (!item) throw new Error();
		expect(item).toBeDefined();
		expect(item.click).toBe(toggleNetwork);
	});




	test(`when isInitializing is true, Development Tools menu is disabled`, () => {
		const ctx = { ...minimalContext, isInitializing: true };
		const template = buildMenuTemplate(ctx as MenuContext);
		const toolsMenu = template[1] as MenuItemConstructorOptions;
		expect(toolsMenu.enabled).toBe(false);
	});
});
