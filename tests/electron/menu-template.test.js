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

describe(`buildMenuTemplate`, () => {
	test(`first top-level item has label containing app name and a submenu array`, () => {
		const template = buildMenuTemplate(minimalContext);
		expect(template.length).toBeGreaterThan(0);
		const first = template[0];
		expect(first.label).toContain(minimalContext.appName);
		expect(Array.isArray(first.submenu)).toBe(true);
	});

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
		const { onOpenSettings: _removed, ...ctx } = minimalContext;
		expect(() => buildMenuTemplate(ctx)).not.toThrow();
	});

	test(`template has multiple top-level items when context has viewport and link data`, () => {
		const template = buildMenuTemplate(minimalContext);
		expect(template.length).toBeGreaterThan(1);
	});

	test(`when updateStatus is downloading, item after About has label indicating downloading`, () => {
		const ctx = { ...minimalContext, updateStatus: `downloading` };
		const template = buildMenuTemplate(ctx);
		const submenu = template[0].submenu;
		const downloadItem = submenu.find(item => item.label && item.label.toLowerCase().includes(`download`));
		expect(downloadItem).toBeDefined();
		expect(downloadItem.type).not.toBe(`separator`);
	});

	test(`when updateStatus is idle, item after About is Check for updates with onCheckForUpdates click`, () => {
		const onCheck = () => { };
		const ctx = { ...minimalContext, updateStatus: `idle`, onCheckForUpdates: onCheck };
		const template = buildMenuTemplate(ctx);
		const submenu = template[0].submenu;
		const checkItem = submenu.find(item => item.label && item.label.includes(`Check for updates`));
		expect(checkItem).toBeDefined();
		expect(checkItem.click).toBe(onCheck);
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

	const updateIcon = `⬆️`;

	test(`when updateStatus is idle, Check for updates label includes update icon`, () => {
		const ctx = { ...minimalContext, updateStatus: `idle` };
		const template = buildMenuTemplate(ctx);
		const submenu = template[0].submenu;
		const checkItem = submenu.find(item => item.label && item.label.includes(`Check for updates`));
		expect(checkItem).toBeDefined();
		expect(checkItem.label).toContain(updateIcon);
	});

	test(`when updateStatus is downloading, Downloading update label includes update icon`, () => {
		const ctx = { ...minimalContext, updateStatus: `downloading` };
		const template = buildMenuTemplate(ctx);
		const submenu = template[0].submenu;
		const item = submenu.find(i => i.label && i.label.toLowerCase().includes(`download`));
		expect(item).toBeDefined();
		expect(item.label).toContain(updateIcon);
	});

	test(`when updateStatus is downloaded, Restart to install top-level item label includes update icon`, () => {
		const ctx = { ...minimalContext, updateStatus: `downloaded` };
		const template = buildMenuTemplate(ctx);
		const last = template[template.length - 1];
		expect(last.label).toMatch(/Update available|Restart to install/i);
		expect(last.label).toContain(updateIcon);
	});

	test(`when testServerActive is false, Tools menu includes Live Test Server item with onStartTestServer click`, () => {
		const onStartTestServer = () => { };
		const ctx = { ...minimalContext, testServerActive: false, testServerRemainingTime: ``, onStartTestServer };
		const template = buildMenuTemplate(ctx);
		const toolsMenu = template.find(item => item.label && item.label.includes(`Tools`));
		const startItem = toolsMenu.submenu.find(item => item.label && item.label.includes(`Live Test Server`));
		expect(startItem).toBeDefined();
		expect(startItem.click).toBe(onStartTestServer);
	});

	test(`when testServerActive is true and testServerRemainingTime is '29m', Tools menu includes 'Test Server running for ~29m' item with sub-menu`, () => {
		const ctx = { ...minimalContext, testServerActive: true, testServerRemainingTime: `29m` };
		const template = buildMenuTemplate(ctx);
		const toolsMenu = template.find(item => item.label && item.label.includes(`Tools`));
		const startItem = toolsMenu.submenu.find(item => item.label && item.label.includes(`Test Server running`));
		expect(startItem).toBeDefined();
		expect(startItem.label).toMatch(/Test Server running for ~29m/);
		expect(Array.isArray(startItem.submenu)).toBe(true);
	});

	test(`when testServerActive is true, Expose sub-menu in Tools has Stop, Copy URL, Open in browser`, () => {
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
		const toolsMenu = template.find(item => item.label && item.label.includes(`Tools`));
		const startItem = toolsMenu.submenu.find(item => item.label && item.label.includes(`Test Server running`));
		expect(startItem).toBeDefined();
		expect(Array.isArray(startItem.submenu)).toBe(true);
		const stopItem = startItem.submenu.find(i => i.label && i.label.toLowerCase().includes(`stop`));
		const copyItem = startItem.submenu.find(i => i.label && i.label.toLowerCase().includes(`copy`));
		const openItem = startItem.submenu.find(i => i.label && i.label.toLowerCase().includes(`open`) || i.label && i.label.toLowerCase().includes(`browser`));
		expect(stopItem).toBeDefined();
		expect(stopItem.click).toBe(onStopTestServer);
		expect(copyItem).toBeDefined();
		expect(copyItem.click).toBe(onCopyTestServerUrl);
		expect(openItem).toBeDefined();
		expect(openItem.click).toBe(onOpenTestServerInBrowser);
	});

	test(`template does NOT include Enable HTTPS option in Tools menu`, () => {
		const onToggle = () => { };
		const ctx = { ...minimalContext, testServerHttpsEnabled: true, onToggleTestServerHttps: onToggle };
		const template = buildMenuTemplate(ctx);
		const toolsMenu = template.find(item => item.label && item.label.includes(`Tools`));
		expect(toolsMenu).toBeDefined();
		const httpsItem = toolsMenu.submenu.find(s => s.label && s.label.toLowerCase().includes(`https`));
		expect(httpsItem).toBeUndefined();
	});

	test(`when testServerActive is true, template includes a top-level status item at the end`, () => {
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

	test(`when isInitializing is true, Tools, Network, and Cache menus are disabled`, () => {
		const ctx = { ...minimalContext, isInitializing: true };
		const template = buildMenuTemplate(ctx);
		const toolsMenu = template.find(item => item.label && item.label.includes(`Tools`));
		const networkMenu = template.find(item => item.label && item.label.includes(`Network`));
		const cacheMenu = template.find(item => item.label && item.label.includes(`Cache`));
		expect(toolsMenu.enabled).toBe(false);
		expect(networkMenu.enabled).toBe(false);
		expect(cacheMenu.enabled).toBe(false);
	});

	test(`when isInitializing is true, App, Viewport, and Links menus are enabled`, () => {
		const ctx = { ...minimalContext, isInitializing: true, linkItems: [{ label: `Link1`, click: noop, enabled: true }] };
		const template = buildMenuTemplate(ctx);
		const appMenu = template.find(item => item.label && item.label.includes(minimalContext.appName));
		const viewportMenu = template.find(item => item.label && item.label.includes(`Viewport`));
		const linksMenu = template.find(item => item.label && item.label.includes(`Links`));
		expect(appMenu.enabled).not.toBe(false);
		expect(viewportMenu.enabled).not.toBe(false);
		expect(linksMenu.enabled).not.toBe(false);
	});
});
