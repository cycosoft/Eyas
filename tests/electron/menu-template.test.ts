import type { MenuItemConstructorOptions } from 'electron';
import { describe, test, expect } from 'vitest';
import { buildMenuTemplate } from '@core/menu-template.js';
import type { MenuContext } from '@registry/menu.js';

const noop = (): void => { };

const minimalContext: MenuContext = {
	appName: `Eyas`,
	isDev: false,
	testNetworkEnabled: true,
	quit: noop,
	startAFreshTest: noop,
	copyUrl: noop,
	navigateHome: noop,
	reload: noop,
	back: noop,
	forward: noop,
	toggleNetwork: noop,
	linkItems: [],
	updateStatus: `idle`,
	onCheckForUpdates: noop,
	onInstallUpdate: noop
};

// ─── Root-level structure ──────────────────────────────────────────────────

describe(`Root menu structure`, () => {
	test(`first top-level item has label containing app name and a submenu array`, () => {
		const template = buildMenuTemplate(minimalContext);
		expect(template.length).toBeGreaterThan(0);
		const first = template[0];
		expect(first.label).toContain(minimalContext.appName);
		expect(Array.isArray(first.submenu)).toBe(true);
	});

	test(`template has multiple top-level items`, () => {
		const template = buildMenuTemplate(minimalContext);
		expect(template.length).toBeGreaterThan(1);
	});

	test(`root menus are in order: Eyas, Test, Browser, Development Tools`, () => {
		const template = buildMenuTemplate(minimalContext);
		expect(template[0].label).toContain(`Eyas`);
		expect(template[1].label).toContain(`Test`);
		expect(template[2].label).toContain(`Browser`);
		expect(template[3].label).toContain(`Development Tools`);
	});
});

// ─── Eyas menu ────────────────────────────────────────────────────────────

describe(`Eyas menu`, () => {
	test(`first submenu does NOT contain Settings and does NOT contain Exit`, () => {
		const template = buildMenuTemplate(minimalContext);
		const submenu = template[0].submenu as MenuItemConstructorOptions[];
		const settingsIndex = submenu.findIndex(item => item.label && item.label.includes(`Settings`));
		const exitIndex = submenu.findIndex(item => item.label && item.label.includes(`Exit`));
		expect(settingsIndex).toBe(-1);
		expect(exitIndex).toBe(-1);
	});

	test(`buildMenuTemplate works without onOpenSettings in context (uses noop default)`, () => {
		expect(() => buildMenuTemplate(minimalContext)).not.toThrow();
	});

	test(`when updateStatus is downloading, Eyas submenu has label indicating downloading`, () => {
		const ctx = { ...minimalContext, updateStatus: `downloading` };
		const template = buildMenuTemplate(ctx as MenuContext);
		const submenu = template[0].submenu as MenuItemConstructorOptions[];
		const downloadItem = submenu.find(item => item.label && item.label.toLowerCase().includes(`download`));
		if (!downloadItem) throw new Error();
		expect(downloadItem).toBeDefined();
		expect(downloadItem.type).not.toBe(`separator`);
	});

	test(`when updateStatus is idle, Eyas submenu has Check for updates with onCheckForUpdates click`, () => {
		const onCheck = (): void => { };
		const ctx = { ...minimalContext, updateStatus: `idle`, onCheckForUpdates: onCheck };
		const template = buildMenuTemplate(ctx as MenuContext);
		const submenu = template[0].submenu as MenuItemConstructorOptions[];
		const checkItem = submenu.find(item => item.label && item.label.includes(`Check for updates`));
		if (!checkItem) throw new Error();
		expect(checkItem).toBeDefined();
		expect(checkItem.click).toBe(onCheck);
	});

	test(`when updateStatus is idle, Check for updates label includes update icon`, () => {
		const updateIcon = `⬆️`;
		const ctx = { ...minimalContext, updateStatus: `idle` };
		const template = buildMenuTemplate(ctx as MenuContext);
		const submenu = template[0].submenu as MenuItemConstructorOptions[];
		const checkItem = submenu.find(item => item.label && item.label.includes(`Check for updates`));
		if (!checkItem) throw new Error();
		expect(checkItem).toBeDefined();
		expect(checkItem.label).toContain(updateIcon);
	});

	test(`when updateStatus is downloading, Downloading update label includes update icon`, () => {
		const updateIcon = `⬆️`;
		const ctx = { ...minimalContext, updateStatus: `downloading` };
		const template = buildMenuTemplate(ctx as MenuContext);
		const submenu = template[0].submenu as MenuItemConstructorOptions[];
		const item = submenu.find(i => i.label && i.label.toLowerCase().includes(`download`));
		if (!item) throw new Error();
		expect(item).toBeDefined();
		expect(item.label).toContain(updateIcon);
	});

	test(`when updateStatus is downloaded, last top-level item is Restart to install with onInstallUpdate click`, () => {
		const onInstall = (): void => { };
		const ctx = { ...minimalContext, updateStatus: `downloaded`, onInstallUpdate: onInstall };
		const template = buildMenuTemplate(ctx as MenuContext);
		const last = template[template.length - 1] as MenuItemConstructorOptions;
		expect(last.label).toMatch(/Update available|Restart to install/i);
		expect(last.click).toBe(onInstall);
	});

	test(`when updateStatus is not downloaded, last top-level item is not update-install item`, () => {
		const ctx = { ...minimalContext, updateStatus: `idle`, linkItems: [{ label: `Link1`, click: noop, enabled: true }] };
		const template = buildMenuTemplate(ctx as MenuContext);
		const last = template[template.length - 1] as MenuItemConstructorOptions;
		expect(last.label).not.toMatch(/Restart to install|Update available/i);
	});

	test(`when updateStatus is downloaded, Restart to install top-level item label includes update icon`, () => {
		const updateIcon = `⬆️`;
		const ctx = { ...minimalContext, updateStatus: `downloaded` };
		const template = buildMenuTemplate(ctx as MenuContext);
		const last = template[template.length - 1] as MenuItemConstructorOptions;
		expect(last.label).toMatch(/Update available|Restart to install/i);
		expect(last.label).toContain(updateIcon);
	});
});

// ─── Test menu ────────────────────────────────────────────────────────────

describe(`Test menu`, () => {
	test(`Test menu exists as second root item`, () => {
		const template = buildMenuTemplate(minimalContext);
		const testMenu = template[1] as MenuItemConstructorOptions;
		expect(testMenu).toBeDefined();
		expect(testMenu.label).toContain(`Test`);
		expect(Array.isArray(testMenu.submenu)).toBe(true);
	});

	test(`Test submenu contains Choose Test Environment using startAFreshTest`, () => {
		const startAFreshTest = (): void => { };
		const ctx = { ...minimalContext, startAFreshTest };
		const template = buildMenuTemplate(ctx as MenuContext);
		const testMenu = template[1] as MenuItemConstructorOptions;
		const envItem = (testMenu.submenu as MenuItemConstructorOptions[]).find(item => item.label && item.label.toLowerCase().includes(`reset`));
		if (!envItem) throw new Error();
		expect(envItem).toBeDefined();
		expect(envItem.click).toBe(startAFreshTest);
	});

	test(`Test submenu does NOT contain Test Home`, () => {
		const template = buildMenuTemplate(minimalContext);
		const testMenu = template[1] as MenuItemConstructorOptions;
		const homeItem = (testMenu.submenu as MenuItemConstructorOptions[]).find(item => item.label && item.label.toLowerCase().includes(`home`));
		expect(homeItem).toBeUndefined();
	});

	test(`Test submenu contains a Links submenu when linkItems is non-empty`, () => {
		const ctx = { ...minimalContext, linkItems: [{ label: `My Link`, click: noop }] };
		const template = buildMenuTemplate(ctx as MenuContext);
		const testMenu = template[1] as MenuItemConstructorOptions;
		const linksItem = (testMenu.submenu as MenuItemConstructorOptions[]).find(item => item.label && item.label.toLowerCase().includes(`link`));
		if (!linksItem) throw new Error();
		expect(linksItem).toBeDefined();
		expect(Array.isArray(linksItem.submenu)).toBe(true);
	});

	test(`Test submenu omits Links submenu when linkItems is empty`, () => {
		const ctx = { ...minimalContext, linkItems: [] };
		const template = buildMenuTemplate(ctx as MenuContext);
		const testMenu = template[1] as MenuItemConstructorOptions;
		const linksItem = (testMenu.submenu as MenuItemConstructorOptions[]).find(item => item.label && item.label.toLowerCase().includes(`link`));
		expect(linksItem).toBeUndefined();
	});

	test(`when isInitializing is true, Test menu is disabled`, () => {
		const ctx = { ...minimalContext, isInitializing: true };
		const template = buildMenuTemplate(ctx as MenuContext);
		const testMenu = template[1] as MenuItemConstructorOptions;
		expect(testMenu.enabled).toBe(false);
	});
});

// ─── Browser menu ─────────────────────────────────────────────────────────

describe(`Browser menu`, () => {
	test(`Browser menu exists as third root item`, () => {
		const template = buildMenuTemplate(minimalContext);
		const browserMenu = template[2] as MenuItemConstructorOptions;
		expect(browserMenu).toBeDefined();
		expect(browserMenu.label).toContain(`Browser`);
		expect(Array.isArray(browserMenu.submenu)).toBe(true);
	});

	test(`Browser submenu contains Copy URL with copyUrl handler`, () => {
		const copyUrl = (): void => { };
		const ctx = { ...minimalContext, copyUrl };
		const template = buildMenuTemplate(ctx as MenuContext);
		const browserMenu = template[2] as MenuItemConstructorOptions;
		const item = (browserMenu.submenu as MenuItemConstructorOptions[]).find(i => i.label && i.label.toLowerCase().includes(`copy url`));
		if (!item) throw new Error();
		expect(item).toBeDefined();
		expect(item.click).toBe(copyUrl);
	});

	test(`Browser submenu does NOT contain Reload`, () => {
		const template = buildMenuTemplate(minimalContext);
		const browserMenu = template[2] as MenuItemConstructorOptions;
		const item = (browserMenu.submenu as MenuItemConstructorOptions[]).find(i => i.label && i.label.toLowerCase().includes(`reload`));
		expect(item).toBeUndefined();
	});

	test(`Browser submenu does NOT contain Back`, () => {
		const template = buildMenuTemplate(minimalContext);
		const browserMenu = template[2] as MenuItemConstructorOptions;
		const item = (browserMenu.submenu as MenuItemConstructorOptions[]).find(i => i.label && i.label.toLowerCase().includes(`back`));
		expect(item).toBeUndefined();
	});

	test(`Browser submenu does NOT contain Forward`, () => {
		const template = buildMenuTemplate(minimalContext);
		const browserMenu = template[2] as MenuItemConstructorOptions;
		const item = (browserMenu.submenu as MenuItemConstructorOptions[]).find(i => i.label && i.label.toLowerCase().includes(`forward`));
		expect(item).toBeUndefined();
	});

	test(`Browser submenu does NOT contain Go Online/Offline toggle`, () => {
		const template = buildMenuTemplate(minimalContext);
		const browserMenu = template[2] as MenuItemConstructorOptions;
		const item = (browserMenu.submenu as MenuItemConstructorOptions[]).find(i => i.label && (i.label.toLowerCase().includes(`online`) || i.label.toLowerCase().includes(`offline`)));
		expect(item).toBeUndefined();
	});


	test(`when isInitializing is true, Browser menu is disabled`, () => {
		const ctx = { ...minimalContext, isInitializing: true };
		const template = buildMenuTemplate(ctx as MenuContext);
		const browserMenu = template[2] as MenuItemConstructorOptions;
		expect(browserMenu.enabled).toBe(false);
	});
});

// ─── Tools menu ───────────────────────────────────────────────────────────

describe(`Development Tools menu`, () => {
	test(`Development Tools menu exists as fourth root item`, () => {
		const template = buildMenuTemplate(minimalContext);
		const toolsMenu = template[3] as MenuItemConstructorOptions;
		expect(toolsMenu).toBeDefined();
		expect(toolsMenu.label).toContain(`Development Tools`);
		expect(Array.isArray(toolsMenu.submenu)).toBe(true);
	});

	test(`Development Tools submenu does NOT contain Copy URL`, () => {
		const template = buildMenuTemplate(minimalContext);
		const toolsMenu = template[3] as MenuItemConstructorOptions;
		const item = (toolsMenu.submenu as MenuItemConstructorOptions[]).find(i => i.label && i.label.toLowerCase().includes(`copy url`));
		expect(item).toBeUndefined();
	});

	test(`Tools submenu contains Go Online/Offline toggle with toggleNetwork handler`, () => {
		const toggleNetwork = (): void => { };
		const ctx = { ...minimalContext, toggleNetwork };
		const template = buildMenuTemplate(ctx as MenuContext);
		const toolsMenu = template[3] as MenuItemConstructorOptions;
		const item = (toolsMenu.submenu as MenuItemConstructorOptions[]).find(i => i.label && (i.label.toLowerCase().includes(`online`) || i.label.toLowerCase().includes(`offline`)));
		if (!item) throw new Error();
		expect(item).toBeDefined();
		expect(item.click).toBe(toggleNetwork);
	});




	test(`when isInitializing is true, Development Tools menu is disabled`, () => {
		const ctx = { ...minimalContext, isInitializing: true };
		const template = buildMenuTemplate(ctx as MenuContext);
		const toolsMenu = template[3] as MenuItemConstructorOptions;
		expect(toolsMenu.enabled).toBe(false);
	});
});
