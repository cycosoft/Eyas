import { describe, test, expect } from 'vitest';
import { buildMenuTemplate } from '../../src/eyas-core/menu-template.js';

const noop = (): void => { };

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
	isEnvironmentPending: false
};

describe(`Live Test Server Gating`, () => {
	test(`should be enabled when config is loaded, environment is not pending, and not initializing`, () => {
		const ctx = { ...minimalContext, isConfigLoaded: true, isEnvironmentPending: false, isInitializing: false };
		const template = buildMenuTemplate(ctx);
		const testMenu = template.find(item => item.label && item.label.includes(`Test`));
		const liveServerItem = testMenu.submenu.find(item => item.label && item.label.includes(`Live Test Server`));

		expect(liveServerItem.enabled).toBe(true);
	});

	test(`should be disabled when config is NOT loaded`, () => {
		const ctx = { ...minimalContext, isConfigLoaded: false };
		const template = buildMenuTemplate(ctx);
		const testMenu = template.find(item => item.label && item.label.includes(`Test`));
		const liveServerItem = testMenu.submenu.find(item => item.label && item.label.includes(`Live Test Server`));

		expect(liveServerItem.enabled).toBe(false);
	});

	test(`should be disabled when environment IS pending`, () => {
		const ctx = { ...minimalContext, isEnvironmentPending: true };
		const template = buildMenuTemplate(ctx);
		const testMenu = template.find(item => item.label && item.label.includes(`Test`));
		const liveServerItem = testMenu.submenu.find(item => item.label && item.label.includes(`Live Test Server`));

		expect(liveServerItem.enabled).toBe(false);
	});
});
