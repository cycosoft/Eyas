import { describe, test, expect } from 'vitest';
import { buildMenuTemplate } from '../../src/eyas-core/menu-template.js';

const noop = () => { };

const minimalContext = {
	appName: `Eyas`,
	isDev: false,
	testNetworkEnabled: true,
	sessionAge: `0m`,
	cacheSize: 0,
	showAbout: noop,
	quit: noop,
	startAFreshTest: noop,
	copyUrl: noop,
	toggleDevTools: noop,
	openUiDevTools: noop,
	navigateHome: noop,
	reload: noop,
	back: noop,
	forward: noop,
	toggleNetwork: noop,
	clearCache: noop,
	openCacheFolder: noop,
	refreshMenu: noop,
	viewportItems: [{ label: `Desktop (1366 x 768)`, click: noop }],
	linkItems: [],
	updateStatus: `idle`,
	onCheckForUpdates: noop,
	onInstallUpdate: noop,
	testServerActive: false,
	testServerRemainingTime: ``,
	onStartTestServer: noop,
	onStopTestServer: noop,
	onCopyTestServerUrl: noop,
	onOpenTestServerInBrowser: noop,
	testServerHttpsEnabled: false,
	onToggleTestServerHttps: noop
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

	test(`root menus are in order: Eyas, Test, Browser, Developer Tools`, () => {
		const template = buildMenuTemplate(minimalContext);
		expect(template[0].label).toContain(`Eyas`);
		expect(template[1].label).toContain(`Test`);
		expect(template[2].label).toContain(`Browser`);
		expect(template[3].label).toContain(`Developer Tools`);
	});
});

// ─── Eyas menu ────────────────────────────────────────────────────────────

describe(`Eyas menu`, () => {
	test(`first submenu contains About then separator then Exit in order`, () => {
		const template = buildMenuTemplate(minimalContext);
		const submenu = template[0].submenu;
		const aboutIndex = submenu.findIndex(item => item.label && item.label.includes(`About`));
		const separatorIndex = submenu.findIndex(item => item.type === `separator`);
		const exitIndex = submenu.findIndex(item => item.label && item.label.includes(`Exit`));
		expect(aboutIndex).toBeGreaterThanOrEqual(0);
		expect(separatorIndex).toBeGreaterThan(aboutIndex);
		expect(exitIndex).toBeGreaterThan(separatorIndex);
	});

	test(`app submenu contains a Settings item`, () => {
		const template = buildMenuTemplate(minimalContext);
		const submenu = template[0].submenu;
		const settingsItem = submenu.find(item => item.label && item.label.includes(`Settings`));
		expect(settingsItem).toBeDefined();
	});

	test(`Settings item uses the onOpenSettings click handler from context`, () => {
		const onOpenSettings = () => { };
		const ctx = { ...minimalContext, onOpenSettings };
		const template = buildMenuTemplate(ctx);
		const submenu = template[0].submenu;
		const settingsItem = submenu.find(item => item.label && item.label.includes(`Settings`));
		expect(settingsItem.click).toBe(onOpenSettings);
	});

	test(`Settings item appears between About and Check for updates`, () => {
		const template = buildMenuTemplate(minimalContext);
		const submenu = template[0].submenu;
		const aboutIndex = submenu.findIndex(item => item.label && item.label.includes(`About`));
		const settingsIndex = submenu.findIndex(item => item.label && item.label.includes(`Settings`));
		const checkIndex = submenu.findIndex(item => item.label && item.label.includes(`Check for updates`));
		expect(settingsIndex).toBeGreaterThan(aboutIndex);
		expect(settingsIndex).toBeLessThan(checkIndex);
	});

	test(`buildMenuTemplate works without onOpenSettings in context (uses noop default)`, () => {
		expect(() => buildMenuTemplate(minimalContext)).not.toThrow();
	});

	test(`when updateStatus is downloading, Eyas submenu has label indicating downloading`, () => {
		const ctx = { ...minimalContext, updateStatus: `downloading` };
		const template = buildMenuTemplate(ctx);
		const submenu = template[0].submenu;
		const downloadItem = submenu.find(item => item.label && item.label.toLowerCase().includes(`download`));
		expect(downloadItem).toBeDefined();
		expect(downloadItem.type).not.toBe(`separator`);
	});

	test(`when updateStatus is idle, Eyas submenu has Check for updates with onCheckForUpdates click`, () => {
		const onCheck = () => { };
		const ctx = { ...minimalContext, updateStatus: `idle`, onCheckForUpdates: onCheck };
		const template = buildMenuTemplate(ctx);
		const submenu = template[0].submenu;
		const checkItem = submenu.find(item => item.label && item.label.includes(`Check for updates`));
		expect(checkItem).toBeDefined();
		expect(checkItem.click).toBe(onCheck);
	});

	test(`when updateStatus is idle, Check for updates label includes update icon`, () => {
		const updateIcon = `⬆️`;
		const ctx = { ...minimalContext, updateStatus: `idle` };
		const template = buildMenuTemplate(ctx);
		const submenu = template[0].submenu;
		const checkItem = submenu.find(item => item.label && item.label.includes(`Check for updates`));
		expect(checkItem).toBeDefined();
		expect(checkItem.label).toContain(updateIcon);
	});

	test(`when updateStatus is downloading, Downloading update label includes update icon`, () => {
		const updateIcon = `⬆️`;
		const ctx = { ...minimalContext, updateStatus: `downloading` };
		const template = buildMenuTemplate(ctx);
		const submenu = template[0].submenu;
		const item = submenu.find(i => i.label && i.label.toLowerCase().includes(`download`));
		expect(item).toBeDefined();
		expect(item.label).toContain(updateIcon);
	});

	test(`when updateStatus is downloaded, last top-level item is Restart to install with onInstallUpdate click`, () => {
		const onInstall = () => { };
		const ctx = { ...minimalContext, updateStatus: `downloaded`, onInstallUpdate: onInstall };
		const template = buildMenuTemplate(ctx);
		const last = template[template.length - 1];
		expect(last.label).toMatch(/Update available|Restart to install/i);
		expect(last.click).toBe(onInstall);
	});

	test(`when updateStatus is not downloaded, last top-level item is not update-install item`, () => {
		const ctx = { ...minimalContext, updateStatus: `idle`, linkItems: [{ label: `Link1`, click: noop, enabled: true }] };
		const template = buildMenuTemplate(ctx);
		const last = template[template.length - 1];
		expect(last.label).not.toMatch(/Restart to install|Update available/i);
	});

	test(`when updateStatus is downloaded, Restart to install top-level item label includes update icon`, () => {
		const updateIcon = `⬆️`;
		const ctx = { ...minimalContext, updateStatus: `downloaded` };
		const template = buildMenuTemplate(ctx);
		const last = template[template.length - 1];
		expect(last.label).toMatch(/Update available|Restart to install/i);
		expect(last.label).toContain(updateIcon);
	});
});

// ─── Test menu ────────────────────────────────────────────────────────────

describe(`Test menu`, () => {
	test(`Test menu exists as second root item`, () => {
		const template = buildMenuTemplate(minimalContext);
		const testMenu = template[1];
		expect(testMenu).toBeDefined();
		expect(testMenu.label).toContain(`Test`);
		expect(Array.isArray(testMenu.submenu)).toBe(true);
	});

	test(`Test submenu contains Choose Test Environment using startAFreshTest`, () => {
		const startAFreshTest = () => { };
		const ctx = { ...minimalContext, startAFreshTest };
		const template = buildMenuTemplate(ctx);
		const testMenu = template[1];
		const envItem = testMenu.submenu.find(item => item.label && item.label.toLowerCase().includes(`environment`));
		expect(envItem).toBeDefined();
		expect(envItem.click).toBe(startAFreshTest);
	});

	test(`Test submenu contains Test Home using navigateHome`, () => {
		const navigateHome = () => { };
		const ctx = { ...minimalContext, navigateHome };
		const template = buildMenuTemplate(ctx);
		const testMenu = template[1];
		const homeItem = testMenu.submenu.find(item => item.label && item.label.toLowerCase().includes(`home`));
		expect(homeItem).toBeDefined();
		expect(homeItem.click).toBe(navigateHome);
	});

	test(`Test submenu contains a Links submenu when linkItems is non-empty`, () => {
		const ctx = { ...minimalContext, linkItems: [{ label: `My Link`, click: noop }] };
		const template = buildMenuTemplate(ctx);
		const testMenu = template[1];
		const linksItem = testMenu.submenu.find(item => item.label && item.label.toLowerCase().includes(`link`));
		expect(linksItem).toBeDefined();
		expect(Array.isArray(linksItem.submenu)).toBe(true);
	});

	test(`Test submenu omits Links submenu when linkItems is empty`, () => {
		const ctx = { ...minimalContext, linkItems: [] };
		const template = buildMenuTemplate(ctx);
		const testMenu = template[1];
		const linksItem = testMenu.submenu.find(item => item.label && item.label.toLowerCase().includes(`link`));
		expect(linksItem).toBeUndefined();
	});

	test(`when testServerActive is false, Test menu includes Live Test Server item with onStartTestServer click`, () => {
		const onStartTestServer = () => { };
		const ctx = { ...minimalContext, testServerActive: false, testServerRemainingTime: ``, onStartTestServer };
		const template = buildMenuTemplate(ctx);
		const testMenu = template[1];
		const startItem = testMenu.submenu.find(item => item.label && item.label.includes(`Live Test Server`));
		expect(startItem).toBeDefined();
		expect(startItem.click).toBe(onStartTestServer);
	});

	test(`when testServerActive is true and testServerRemainingTime is '29m', Test menu includes 'Test Server running for ~29m' item with sub-menu`, () => {
		const ctx = { ...minimalContext, testServerActive: true, testServerRemainingTime: `29m` };
		const template = buildMenuTemplate(ctx);
		const testMenu = template[1];
		const startItem = testMenu.submenu.find(item => item.label && item.label.includes(`Test Server running`));
		expect(startItem).toBeDefined();
		expect(startItem.label).toMatch(/Test Server running for ~29m/);
		expect(Array.isArray(startItem.submenu)).toBe(true);
	});

	test(`when testServerActive is true, Test menu sub-menu has Stop, Copy URL, Open in browser`, () => {
		const onStopTestServer = () => { };
		const onCopyTestServerUrl = () => { };
		const onOpenTestServerInBrowser = () => { };
		const ctx = {
			...minimalContext,
			testServerActive: true,
			testServerRemainingTime: `5m`,
			onStopTestServer,
			onCopyTestServerUrl,
			onOpenTestServerInBrowser
		};
		const template = buildMenuTemplate(ctx);
		const testMenu = template[1];
		const startItem = testMenu.submenu.find(item => item.label && item.label.includes(`Test Server running`));
		expect(startItem).toBeDefined();
		expect(Array.isArray(startItem.submenu)).toBe(true);
		const stopItem = startItem.submenu.find(i => i.label && i.label.toLowerCase().includes(`stop`));
		const copyItem = startItem.submenu.find(i => i.label && i.label.toLowerCase().includes(`copy`));
		const openItem = startItem.submenu.find(i => i.label && (i.label.toLowerCase().includes(`open`) || i.label.toLowerCase().includes(`browser`)));
		expect(stopItem).toBeDefined();
		expect(stopItem.click).toBe(onStopTestServer);
		expect(copyItem).toBeDefined();
		expect(copyItem.click).toBe(onCopyTestServerUrl);
		expect(openItem).toBeDefined();
		expect(openItem.click).toBe(onOpenTestServerInBrowser);
	});

	test(`when testServerActive is true, template still includes a top-level status item at the end`, () => {
		const ctx = { ...minimalContext, testServerActive: true, testServerRemainingTime: `15m` };
		const template = buildMenuTemplate(ctx);
		const last = template[template.length - 1];
		expect(last.label).toMatch(/Test Server running for ~15m/);
		expect(Array.isArray(last.submenu)).toBe(true);
	});

	test(`when testServerActive is false, template does not include top-level status item at the end`, () => {
		const ctx = { ...minimalContext, testServerActive: false };
		const template = buildMenuTemplate(ctx);
		const last = template[template.length - 1];
		expect(last.label).not.toMatch(/Exposed for/);
	});

	test(`when isInitializing is true, Test menu is disabled`, () => {
		const ctx = { ...minimalContext, isInitializing: true };
		const template = buildMenuTemplate(ctx);
		const testMenu = template[1];
		expect(testMenu.enabled).toBe(false);
	});
});

// ─── Browser menu ─────────────────────────────────────────────────────────

describe(`Browser menu`, () => {
	test(`Browser menu exists as third root item`, () => {
		const template = buildMenuTemplate(minimalContext);
		const browserMenu = template[2];
		expect(browserMenu).toBeDefined();
		expect(browserMenu.label).toContain(`Browser`);
		expect(Array.isArray(browserMenu.submenu)).toBe(true);
	});

	test(`Browser submenu contains Reload with reload handler`, () => {
		const reload = () => { };
		const ctx = { ...minimalContext, reload };
		const template = buildMenuTemplate(ctx);
		const browserMenu = template[2];
		const item = browserMenu.submenu.find(i => i.label && i.label.toLowerCase().includes(`reload`));
		expect(item).toBeDefined();
		expect(item.click).toBe(reload);
	});

	test(`Browser submenu contains Back with back handler`, () => {
		const back = () => { };
		const ctx = { ...minimalContext, back };
		const template = buildMenuTemplate(ctx);
		const browserMenu = template[2];
		const item = browserMenu.submenu.find(i => i.label && i.label.toLowerCase().includes(`back`));
		expect(item).toBeDefined();
		expect(item.click).toBe(back);
	});

	test(`Browser submenu contains Forward with forward handler`, () => {
		const forward = () => { };
		const ctx = { ...minimalContext, forward };
		const template = buildMenuTemplate(ctx);
		const browserMenu = template[2];
		const item = browserMenu.submenu.find(i => i.label && i.label.toLowerCase().includes(`forward`));
		expect(item).toBeDefined();
		expect(item.click).toBe(forward);
	});

	test(`Browser submenu does NOT contain Go Online/Offline toggle`, () => {
		const template = buildMenuTemplate(minimalContext);
		const browserMenu = template[2];
		const item = browserMenu.submenu.find(i => i.label && (i.label.toLowerCase().includes(`online`) || i.label.toLowerCase().includes(`offline`)));
		expect(item).toBeUndefined();
	});

	test(`Browser submenu contains a Viewport submenu`, () => {
		const ctx = { ...minimalContext, viewportItems: [{ label: `Desktop (1366 x 768)`, click: noop }] };
		const template = buildMenuTemplate(ctx);
		const browserMenu = template[2];
		const viewportItem = browserMenu.submenu.find(i => i.label && i.label.toLowerCase().includes(`viewport`));
		expect(viewportItem).toBeDefined();
		expect(Array.isArray(viewportItem.submenu)).toBe(true);
	});

	test(`when isInitializing is true, Browser menu is disabled`, () => {
		const ctx = { ...minimalContext, isInitializing: true };
		const template = buildMenuTemplate(ctx);
		const browserMenu = template[2];
		expect(browserMenu.enabled).toBe(false);
	});
});

// ─── Tools menu ───────────────────────────────────────────────────────────

describe(`Developer Tools menu`, () => {
	test(`Developer Tools menu exists as fourth root item`, () => {
		const template = buildMenuTemplate(minimalContext);
		const toolsMenu = template[3];
		expect(toolsMenu).toBeDefined();
		expect(toolsMenu.label).toContain(`Developer Tools`);
		expect(Array.isArray(toolsMenu.submenu)).toBe(true);
	});

	test(`Tools submenu contains Copy URL with copyUrl handler`, () => {
		const copyUrl = () => { };
		const ctx = { ...minimalContext, copyUrl };
		const template = buildMenuTemplate(ctx);
		const toolsMenu = template[3];
		const item = toolsMenu.submenu.find(i => i.label && i.label.toLowerCase().includes(`copy url`));
		expect(item).toBeDefined();
		expect(item.click).toBe(copyUrl);
	});

	test(`Tools submenu contains Go Online/Offline toggle with toggleNetwork handler`, () => {
		const toggleNetwork = () => { };
		const ctx = { ...minimalContext, toggleNetwork };
		const template = buildMenuTemplate(ctx);
		const toolsMenu = template[3];
		const item = toolsMenu.submenu.find(i => i.label && (i.label.toLowerCase().includes(`online`) || i.label.toLowerCase().includes(`offline`)));
		expect(item).toBeDefined();
		expect(item.click).toBe(toggleNetwork);
	});

	test(`Tools submenu contains a Cache submenu with Age, Size, and Clear items`, () => {
		const ctx = { ...minimalContext, sessionAge: `5m`, cacheSize: 1024 };
		const template = buildMenuTemplate(ctx);
		const toolsMenu = template[3];
		const cacheItem = toolsMenu.submenu.find(i => i.label && i.label.toLowerCase().includes(`cache`));
		expect(cacheItem).toBeDefined();
		expect(Array.isArray(cacheItem.submenu)).toBe(true);
		const ageItem = cacheItem.submenu.find(i => i.label && i.label.toLowerCase().includes(`age`));
		const sizeItem = cacheItem.submenu.find(i => i.label && i.label.toLowerCase().includes(`size`));
		const clearItem = cacheItem.submenu.find(i => i.label && i.label.toLowerCase().includes(`clear`));
		expect(ageItem).toBeDefined();
		expect(sizeItem).toBeDefined();
		expect(clearItem).toBeDefined();
	});

	test(`Tools submenu contains Developer Tools item`, () => {
		const template = buildMenuTemplate(minimalContext);
		const toolsMenu = template[3];
		const devToolsItem = toolsMenu.submenu.find(i => i.label && i.label.toLowerCase().includes(`developer tools`));
		expect(devToolsItem).toBeDefined();
	});

	test(`template does NOT include Enable HTTPS option in Developer Tools menu`, () => {
		const onToggle = () => { };
		const ctx = { ...minimalContext, testServerHttpsEnabled: true, onToggleTestServerHttps: onToggle };
		const template = buildMenuTemplate(ctx);
		const toolsMenu = template[3];
		expect(toolsMenu).toBeDefined();
		const httpsItem = toolsMenu.submenu.find(s => s.label && s.label.toLowerCase().includes(`https`));
		expect(httpsItem).toBeUndefined();
	});

	test(`when isInitializing is true, Developer Tools menu is disabled`, () => {
		const ctx = { ...minimalContext, isInitializing: true };
		const template = buildMenuTemplate(ctx);
		const toolsMenu = template[3];
		expect(toolsMenu.enabled).toBe(false);
	});
});
