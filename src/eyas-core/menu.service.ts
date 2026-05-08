import { Menu, app, clipboard } from 'electron';
import { buildMenuTemplate } from './menu-template.js';
import { isVariableLinkValid } from '@scripts/variable-utils.js';
import { parseURL } from '@scripts/parse-url.js';

// Types
import type { MenuService, CoreContext } from '@registry/eyas-core.js';
import type { MenuContext } from '@registry/menu.js';
import type { ValidatedConfig } from '@registry/config.js';
import type { IsActive, LabelString } from '@registry/primitives.js';
import type { NavItem } from '@registry/components.js';

/** Service for managing the application menu */
export const menuService: MenuService = {
	/**
	 * Refreshes the application menu with the current state.
	 * @param ctx The core context of the application.
	 */
	refresh: async (ctx: CoreContext): Promise<void> => {
		const { $appWindow, $config } = ctx;
		if (!$appWindow || $appWindow.isDestroyed() || !$config) { return; }

		const context = menuService.getContext(ctx);

		const template = buildMenuTemplate(context);
		Menu.setApplicationMenu(Menu.buildFromTemplate(template));
	},



	/**
	 * Assembles the menu context object required for building the application menu template.
	 * @param ctx The core context of the application.
	 * @returns The fully assembled MenuContext object.
	 */
	getContext: (ctx: CoreContext): MenuContext => {
		return {
			isDev: process.argv.includes(`--dev`),
			testNetworkEnabled: ctx.$testNetworkEnabled,
			...menuService.getAppHandlers(ctx),
			...menuService.getNavigationHandlers(ctx),
			...menuService.getTestServerHandlers(ctx)
		} as MenuContext;
	},

	/**
	 * Returns the application-level handlers for the menu.
	 * @param ctx The core context.
	 * @returns Partial MenuContext with application handlers.
	 */
	getAppHandlers: (ctx: CoreContext): Partial<MenuContext> => ({
		quit: (): void => { app.quit(); },
		onOpenSettings: (): void => ctx.onOpenSettings(),
		onShowWhatsNew: (): void => ctx.uiEvent(`show-whats-new`, true),
		isInitializing: ctx.$isInitializing,
		isConfigLoaded: !!ctx.$config?.meta?.isConfigLoaded,
		isEnvironmentPending: ctx.$isEnvironmentPending
	}),

	/**
	 * Returns the navigation-level handlers for the menu.
	 * @param ctx The core context.
	 * @returns Partial MenuContext with navigation handlers.
	 */
	getNavigationHandlers: (ctx: CoreContext): Partial<MenuContext> => ({
		navigateHome: (): void => ctx.navigate(),
		reload: (): void => ctx.reload(),
		back: (): void => ctx.goBack(),
		forward: (): void => ctx.goForward(),
		copyUrl: (): void => {
			const webContents = ctx.$testLayer?.webContents || ctx.$appWindow?.webContents;
			if (ctx.$isInitializing || !webContents || webContents.isDestroyed()) return;
			clipboard.writeText(webContents.getURL());
		}
	}),

	/**
	 * Returns the test server and development handlers for the menu.
	 * @param ctx The core context.
	 * @returns Partial MenuContext with test server and development handlers.
	 */
	getTestServerHandlers: (ctx: CoreContext): Partial<MenuContext> => ({
		toggleNetwork: (): void => {
			if (ctx.$isInitializing) return;
			ctx.setTestNetworkEnabled(!ctx.$testNetworkEnabled);
			ctx.setMenu();
		}
	}),

	/**
	 * Returns a list of serializable link items for the renderer
	 * @param config The validated configuration
	 * @returns The list of serializable link items
	 */
	getSerializableLinks: (config: ValidatedConfig | null): NavItem[] => {
		if (!config?.links) { return []; }

		return config.links.map((link, index) => {
			const isExternal = !!link.external;
			const label = isExternal ? `🌐 ${link.label}` : link.label;
			const isVariable = link.url.includes(`{`);

			let isValid: IsActive;
			let value: LabelString;

			if (isVariable) {
				isValid = isVariableLinkValid(link.url);
				value = `launch-link-var:${link.url}`;
			} else {
				const parsed = parseURL(link.url);
				isValid = !!parsed;
				value = `launch-link:${JSON.stringify({ url: parsed?.toString() || link.url, openInBrowser: isExternal })}`;
			}

			return {
				title: isValid ? label : `${label} (invalid entry: "${link.url}")`,
				value: isValid ? value : `invalid-link-${index}`,
				actionable: isValid
			};
		});
	}
};
