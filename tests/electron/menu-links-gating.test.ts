import type { MenuItemConstructorOptions } from 'electron';
import { describe, test, expect } from 'vitest';
import { buildMenuTemplate } from '@core/menu-template.js';
import type { MenuContext } from '@registry/menu.js';

const noop = (): void => { };

const minimalContext: MenuContext = {
	appName: `Eyas`,
	isDev: false,
	isConfigLoaded: true,
	isEnvironmentPending: false,
	isInitializing: false,
	testNetworkEnabled: true,
	sessionAge: `0m`,
	cacheSize: 0,
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
	toggleTestDevTools: noop,
	onStartTestServer: noop
};

describe(`Menu links and DevTools gating (Refined)`, () => {
	describe(`State: No Test Loaded`, () => {
		const ctx = {
			...minimalContext,
			isConfigLoaded: false,
			isInitializing: true // At startup
		};

		test(`root menus 'Test' and 'Browser' are disabled`, () => {
			const template = buildMenuTemplate(ctx as MenuContext) as MenuItemConstructorOptions[];
			const testMenu = template.find((m: MenuItemConstructorOptions) => m.label && m.label.includes(`Test`));
			if (!testMenu) throw new Error();
			const browserMenu = template.find((m: MenuItemConstructorOptions) => m.label && m.label.includes(`Browser`));
			if (!browserMenu) throw new Error();

			expect(testMenu.enabled).toBe(false);
			expect(browserMenu.enabled).toBe(false);
		});

		test(`DevTools root menu is enabled only if isDev is true`, () => {
			const devTemplate = buildMenuTemplate({ ...ctx, isDev: true } as MenuContext) as MenuItemConstructorOptions[];
			const prodTemplate = buildMenuTemplate({ ...ctx, isDev: false } as MenuContext) as MenuItemConstructorOptions[];

			const devToolsMenu = devTemplate.find((m: MenuItemConstructorOptions) => m.label && m.label.includes(`Development Tools`));
			if (!devToolsMenu) throw new Error();
			const prodToolsMenu = prodTemplate.find((m: MenuItemConstructorOptions) => m.label && m.label.includes(`Development Tools`));
			if (!prodToolsMenu) throw new Error();

			expect(devToolsMenu.enabled).not.toBe(false);
			expect(prodToolsMenu.enabled).toBe(false);
		});

		test(`Specific items like 'Developer Tools (Test)' and 'Stop network' are disabled`, () => {
			const template = buildMenuTemplate({ ...ctx, isDev: true } as MenuContext) as MenuItemConstructorOptions[];
			const toolsMenu = template.find((m: MenuItemConstructorOptions) => m.label && m.label.includes(`Development Tools`));
			if (!toolsMenu) throw new Error();

			const testDevTools = (toolsMenu.submenu as MenuItemConstructorOptions[]).find((i: MenuItemConstructorOptions) => i.label && i.label.includes(`(Test)`));
			if (!testDevTools) throw new Error();
			const networkToggle = (toolsMenu.submenu as MenuItemConstructorOptions[]).find((i: MenuItemConstructorOptions) => i.label && (i.label.includes(`Online`) || i.label.includes(`Offline`)));
			if (!networkToggle) throw new Error();

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
			} as MenuContext) as MenuItemConstructorOptions[];
			const testMenu = template.find((m: MenuItemConstructorOptions) => m.label && m.label.includes(`Test`));
			if (!testMenu) throw new Error();
			const linksItem = (testMenu.submenu as MenuItemConstructorOptions[]).find((i: MenuItemConstructorOptions) => i.label && i.label.includes(`Links`));
			if (!linksItem) throw new Error();

			expect(linksItem.enabled).toBe(false);
		});

		test(`'Developer Tools (Test)' is ENABLED`, () => {
			const template = buildMenuTemplate(ctx as MenuContext) as MenuItemConstructorOptions[];
			const toolsMenu = template.find((m: MenuItemConstructorOptions) => m.label && m.label.includes(`Development Tools`));
			if (!toolsMenu) throw new Error();
			const testDevTools = (toolsMenu.submenu as MenuItemConstructorOptions[]).find((i: MenuItemConstructorOptions) => i.label && i.label.includes(`(Test)`));
			if (!testDevTools) throw new Error();

			expect(testDevTools.enabled).not.toBe(false);
		});

		test(`'Go Online/Offline' is ENABLED`, () => {
			const template = buildMenuTemplate(ctx as MenuContext) as MenuItemConstructorOptions[];
			const toolsMenu = template.find((m: MenuItemConstructorOptions) => m.label && m.label.includes(`Development Tools`));
			if (!toolsMenu) throw new Error();
			const networkToggle = (toolsMenu.submenu as MenuItemConstructorOptions[]).find((i: MenuItemConstructorOptions) => i.label && (i.label.includes(`Online`) || i.label.includes(`Offline`)));
			if (!networkToggle) throw new Error();

			expect(networkToggle.enabled).not.toBe(false);
		});

		test(`'Developer Tools (eyas)' is ENABLED and renamed`, () => {
			const template = buildMenuTemplate(ctx as MenuContext) as MenuItemConstructorOptions[];
			const toolsMenu = template.find((m: MenuItemConstructorOptions) => m.label && m.label.includes(`Development Tools`));
			if (!toolsMenu) throw new Error();
			const eyasDevTools = (toolsMenu.submenu as MenuItemConstructorOptions[]).find((i: MenuItemConstructorOptions) => i.label && i.label.toLowerCase().includes(`eyas`));
			if (!eyasDevTools) throw new Error();

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
			const template = buildMenuTemplate(ctx as MenuContext) as MenuItemConstructorOptions[];
			const toolsMenu = template.find((m: MenuItemConstructorOptions) => m.label && m.label.includes(`Development Tools`));
			if (!toolsMenu) throw new Error();
			const cacheItem = (toolsMenu.submenu as MenuItemConstructorOptions[]).find((i: MenuItemConstructorOptions) => i.label && i.label.includes(`Cache`));
			if (!cacheItem) throw new Error();

			(cacheItem.submenu as MenuItemConstructorOptions[]).forEach((i: MenuItemConstructorOptions) => {
				if (i.label) {
					expect(i.enabled).not.toBe(false);
				}
			});
		});
	});
});
