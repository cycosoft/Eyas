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
	onInstallUpdate: noop
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
});
