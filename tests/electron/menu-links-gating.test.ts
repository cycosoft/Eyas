import type { MenuItemConstructorOptions } from 'electron';
import { describe, test, expect } from 'vitest';
import { buildMenuTemplate } from '@core/menu-template.js';
import type { MenuContext } from '@registry/menu.js';

const noop = (): void => { };

const minimalContext: MenuContext = {
	isDev: false,
	isConfigLoaded: true,
	isEnvironmentPending: false,
	isInitializing: false,
	testNetworkEnabled: true,
	quit: noop,
	navigateHome: noop,
	reload: noop,
	back: noop,
	forward: noop,
	toggleNetwork: noop
};

describe(`Menu links and DevTools gating (Refined)`, () => {
	describe(`State: No Test Loaded`, () => {
		const ctx = {
			...minimalContext,
			isConfigLoaded: false,
			isInitializing: true // At startup
		};

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

		test(`'Stop network' is disabled`, () => {
			const template = buildMenuTemplate({ ...ctx, isDev: true } as MenuContext) as MenuItemConstructorOptions[];
			const toolsMenu = template.find((m: MenuItemConstructorOptions) => m.label && m.label.includes(`Development Tools`));
			if (!toolsMenu) throw new Error();

			const networkToggle = (toolsMenu.submenu as MenuItemConstructorOptions[]).find((i: MenuItemConstructorOptions) => i.label && (i.label.includes(`Online`) || i.label.includes(`Offline`)));
			if (!networkToggle) throw new Error();

			expect(networkToggle.enabled).toBe(false);
		});
	});

});


