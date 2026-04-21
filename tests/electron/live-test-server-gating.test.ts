import type { MenuItemConstructorOptions } from 'electron';
import { describe, test, expect } from 'vitest';
import { buildMenuTemplate } from '@core/menu-template.js';
import type { MenuContext } from '@registry/menu.js';

const noop = (): void => { };

const minimalContext: MenuContext = {
	appName: `Eyas`,
	isDev: false,
	testNetworkEnabled: true,
	sessionAge: `0m`,
	cacheSize: 0,
	showAbout: noop,
	quit: noop,
	startAFreshTest: noop,
	copyUrl: noop,
	openUiDevTools: noop,
	navigateHome: noop,
	reload: noop,
	back: noop,
	forward: noop,
	toggleNetwork: noop,
	clearCache: noop,
	openCacheFolder: noop,
	refreshMenu: noop,
	viewportItems: [],
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
	onToggleTestServerHttps: noop,
	isInitializing: false,
	isConfigLoaded: true,
	isEnvironmentPending: false,
	toggleTestDevTools: noop
};

describe(`Live Test Server Gating`, () => {
	test(`should be enabled when config is loaded, environment is not pending, and not initializing`, () => {
		const ctx = { ...minimalContext, isConfigLoaded: true, isEnvironmentPending: false, isInitializing: false };
		const template = buildMenuTemplate(ctx as MenuContext) as MenuItemConstructorOptions[];
		const testMenu = template.find((item: MenuItemConstructorOptions) => item.label && item.label.includes(`Test`));
		if (!testMenu) throw new Error();
		const liveServerItem = (testMenu.submenu as MenuItemConstructorOptions[]).find((item: MenuItemConstructorOptions) => item.label && item.label.includes(`Live Test Server`));
		if (!liveServerItem) throw new Error();

		expect(liveServerItem.enabled).toBe(true);
	});

	test(`should be disabled when config is NOT loaded`, () => {
		const ctx = { ...minimalContext, isConfigLoaded: false };
		const template = buildMenuTemplate(ctx as MenuContext) as MenuItemConstructorOptions[];
		const testMenu = template.find((item: MenuItemConstructorOptions) => item.label && item.label.includes(`Test`));
		if (!testMenu) throw new Error();
		const liveServerItem = (testMenu.submenu as MenuItemConstructorOptions[]).find((item: MenuItemConstructorOptions) => item.label && item.label.includes(`Live Test Server`));
		if (!liveServerItem) throw new Error();

		expect(liveServerItem.enabled).toBe(false);
	});

	test(`should be disabled when environment IS pending`, () => {
		const ctx = { ...minimalContext, isEnvironmentPending: true };
		const template = buildMenuTemplate(ctx as MenuContext) as MenuItemConstructorOptions[];
		const testMenu = template.find((item: MenuItemConstructorOptions) => item.label && item.label.includes(`Test`));
		if (!testMenu) throw new Error();
		const liveServerItem = (testMenu.submenu as MenuItemConstructorOptions[]).find((item: MenuItemConstructorOptions) => item.label && item.label.includes(`Live Test Server`));
		if (!liveServerItem) throw new Error();

		expect(liveServerItem.enabled).toBe(false);
	});
});
