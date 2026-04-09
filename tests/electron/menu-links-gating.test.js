import { describe, test, expect } from 'vitest';
import { buildMenuTemplate } from '../../src/eyas-core/menu-template.js';

const noop = () => { };

const minimalContext = {
	appName: `Eyas`,
	isDev: false,
	isConfigLoaded: true,
	isEnvironmentPending: false,
	isInitializing: false,
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
	toggleTestDevTools: noop
};

describe(`Menu links and DevTools gating (Refined)`, () => {
	describe(`State: No Test Loaded`, () => {
		const ctx = {
			...minimalContext,
			isConfigLoaded: false,
			isInitializing: true // At startup
		};

		test(`root menus 'Test' and 'Browser' are disabled`, () => {
			const template = buildMenuTemplate(ctx);
			const testMenu = template.find(m => m.label && m.label.includes(`Test`));
			const browserMenu = template.find(m => m.label && m.label.includes(`Browser`));

			expect(testMenu.enabled).toBe(false);
			expect(browserMenu.enabled).toBe(false);
		});

		test(`DevTools root menu is enabled only if isDev is true`, () => {
			const devTemplate = buildMenuTemplate({ ...ctx, isDev: true });
			const prodTemplate = buildMenuTemplate({ ...ctx, isDev: false });

			const devToolsMenu = devTemplate.find(m => m.label && m.label.includes(`Development Tools`));
			const prodToolsMenu = prodTemplate.find(m => m.label && m.label.includes(`Development Tools`));

			expect(devToolsMenu.enabled).not.toBe(false);
			expect(prodToolsMenu.enabled).toBe(false);
		});

		test(`Specific items like 'Developer Tools (Test)' and 'Stop network' are disabled`, () => {
			const template = buildMenuTemplate({ ...ctx, isDev: true });
			const toolsMenu = template.find(m => m.label && m.label.includes(`Development Tools`));

			const testDevTools = toolsMenu.submenu.find(i => i.label && i.label.includes(`(Test)`));
			const networkToggle = toolsMenu.submenu.find(i => i.label && (i.label.includes(`Online`) || i.label.includes(`Offline`)));

			expect(testDevTools.enabled).toBe(false);
			expect(networkToggle.enabled).toBe(false);
		});
	});

	describe(`State: Environment Pending`, () => {
		const ctx = {
			...minimalContext,
			isConfigLoaded: true,
			isEnvironmentPending: true,
			isInitializing: true,
			isDev: true
		};

		test(`'Test > Links' is disabled`, () => {
			const template = buildMenuTemplate({
				...ctx,
				linkItems: [{ label: `Link 1`, click: noop }]
			});
			const testMenu = template.find(m => m.label && m.label.includes(`Test`));
			const linksItem = testMenu.submenu.find(i => i.label && i.label.includes(`Links`));

			expect(linksItem.enabled).toBe(false);
		});

		test(`'Developer Tools (Test)' is ENABLED`, () => {
			const template = buildMenuTemplate(ctx);
			const toolsMenu = template.find(m => m.label && m.label.includes(`Development Tools`));
			const testDevTools = toolsMenu.submenu.find(i => i.label && i.label.includes(`(Test)`));

			expect(testDevTools.enabled).not.toBe(false);
		});

		test(`'Go Online/Offline' is ENABLED`, () => {
			const template = buildMenuTemplate(ctx);
			const toolsMenu = template.find(m => m.label && m.label.includes(`Development Tools`));
			const networkToggle = toolsMenu.submenu.find(i => i.label && (i.label.includes(`Online`) || i.label.includes(`Offline`)));

			expect(networkToggle.enabled).not.toBe(false);
		});

		test(`'Developer Tools (eyas)' is ENABLED and renamed`, () => {
			const template = buildMenuTemplate(ctx);
			const toolsMenu = template.find(m => m.label && m.label.includes(`Development Tools`));
			const eyasDevTools = toolsMenu.submenu.find(i => i.label && i.label.toLowerCase().includes(`eyas`));

			expect(eyasDevTools).toBeDefined();
			expect(eyasDevTools.enabled).not.toBe(false);
		});
	});

	describe(`Global Settings`, () => {
		test(`Cache submenu items are always enabled if config is loaded`, () => {
			const ctx = {
				...minimalContext,
				isConfigLoaded: true,
				isInitializing: true
			};
			const template = buildMenuTemplate(ctx);
			const toolsMenu = template.find(m => m.label && m.label.includes(`Development Tools`));
			const cacheItem = toolsMenu.submenu.find(i => i.label && i.label.includes(`Cache`));

			cacheItem.submenu.forEach(i => {
				if (i.label) {
					expect(i.enabled).not.toBe(false);
				}
			});
		});
	});
});
