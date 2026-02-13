import { describe, test, expect } from 'vitest';
import { buildMenuTemplate } from '../../src/eyas-core/menu-template.js';

const noop = () => {};

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
	exposeActive: false,
	exposeRemainingMinutes: 0,
	onStartExpose: noop,
	onStopExpose: noop,
	onCopyExposedUrl: noop,
	onOpenExposedInBrowser: noop,
	exposeHttpsEnabled: false,
	onToggleExposeHttps: noop
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

	test(`template has multiple top-level items when context has viewport and link data`, () => {
		const template = buildMenuTemplate(minimalContext);
		expect(template.length).toBeGreaterThan(1);
	});

	test(`when updateStatus is downloading, item after About has label indicating downloading`, () => {
		const ctx = { ...minimalContext, updateStatus: `downloading` };
		const template = buildMenuTemplate(ctx);
		const submenu = template[0].submenu;
		const aboutIndex = submenu.findIndex(item => item.label && item.label.includes(`About`));
		const itemAfterAbout = submenu[aboutIndex + 1];
		expect(itemAfterAbout.type).not.toBe(`separator`);
		expect(itemAfterAbout.label.toLowerCase()).toMatch(/download/);
	});

	test(`when updateStatus is idle, item after About is Check for updates with onCheckForUpdates click`, () => {
		const onCheck = () => {};
		const ctx = { ...minimalContext, updateStatus: `idle`, onCheckForUpdates: onCheck };
		const template = buildMenuTemplate(ctx);
		const submenu = template[0].submenu;
		const checkItem = submenu.find(item => item.label && item.label.includes(`Check for updates`));
		expect(checkItem).toBeDefined();
		expect(checkItem.click).toBe(onCheck);
	});

	test(`when updateStatus is downloaded, last top-level item is Restart to install with onInstallUpdate click`, () => {
		const onInstall = () => {};
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

	test(`when exposeActive is false, Tools menu includes Expose Test item with onStartExpose click`, () => {
		const onStartExpose = () => {};
		const ctx = { ...minimalContext, exposeActive: false, exposeRemainingMinutes: 0, onStartExpose };
		const template = buildMenuTemplate(ctx);
		const toolsMenu = template.find(item => item.label && item.label.includes(`Tools`));
		const startItem = toolsMenu.submenu.find(item => item.label && item.label.includes(`Expose Test`));
		expect(startItem).toBeDefined();
		expect(startItem.click).toBe(onStartExpose);
	});

	test(`when exposeActive is true and exposeRemainingMinutes is 29, Tools menu includes 'Exposed for ~29m' item with sub-menu`, () => {
		const ctx = { ...minimalContext, exposeActive: true, exposeRemainingMinutes: 29 };
		const template = buildMenuTemplate(ctx);
		const toolsMenu = template.find(item => item.label && item.label.includes(`Tools`));
		const startItem = toolsMenu.submenu.find(item => item.label && item.label.includes(`Exposed`));
		expect(startItem).toBeDefined();
		expect(startItem.label).toMatch(/Exposed for ~29m/);
		expect(Array.isArray(startItem.submenu)).toBe(true);
	});

	test(`when exposeActive is true, Expose sub-menu in Tools has Stop, Copy URL, Open in browser`, () => {
		const onStopExpose = () => {};
		const onCopyExposedUrl = () => {};
		const onOpenExposedInBrowser = () => {};
		const ctx = {
			...minimalContext,
			exposeActive: true,
			exposeRemainingMinutes: 5,
			onStopExpose,
			onCopyExposedUrl,
			onOpenExposedInBrowser
		};
		const template = buildMenuTemplate(ctx);
		const toolsMenu = template.find(item => item.label && item.label.includes(`Tools`));
		const startItem = toolsMenu.submenu.find(item => item.label && item.label.includes(`Exposed`));
		expect(startItem).toBeDefined();
		expect(Array.isArray(startItem.submenu)).toBe(true);
		const stopItem = startItem.submenu.find(i => i.label && i.label.toLowerCase().includes(`stop`));
		const copyItem = startItem.submenu.find(i => i.label && i.label.toLowerCase().includes(`copy`));
		const openItem = startItem.submenu.find(i => i.label && i.label.toLowerCase().includes(`open`) || i.label && i.label.toLowerCase().includes(`browser`));
		expect(stopItem).toBeDefined();
		expect(stopItem.click).toBe(onStopExpose);
		expect(copyItem).toBeDefined();
		expect(copyItem.click).toBe(onCopyExposedUrl);
		expect(openItem).toBeDefined();
		expect(openItem.click).toBe(onOpenExposedInBrowser);
	});

	test(`template does NOT include Enable HTTPS option in Tools menu`, () => {
		const onToggle = () => {};
		const ctx = { ...minimalContext, exposeHttpsEnabled: true, onToggleExposeHttps: onToggle };
		const template = buildMenuTemplate(ctx);
		const toolsMenu = template.find(item => item.label && item.label.includes(`Tools`));
		expect(toolsMenu).toBeDefined();
		const httpsItem = toolsMenu.submenu.find(s => s.label && s.label.toLowerCase().includes(`https`));
		expect(httpsItem).toBeUndefined();
	});
});
