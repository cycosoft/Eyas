import { Menu, app, clipboard, shell } from 'electron';
import { buildMenuTemplate } from './menu-template.js';
import { isVariableLinkValid } from '@scripts/variable-utils.js';
import { parseURL } from '@scripts/parse-url.js';

// Types
import type { MenuService, CoreContext } from '@registry/eyas-core.js';
import type { MenuTemplate, LinkMenuHandlers, MenuContextParams, MenuContext } from '@registry/menu.js';
import type { ValidatedConfig, LinkConfig } from '@registry/config.js';
import type { DomainUrl } from '@registry/primitives.js';

/** Service for managing the application menu */
export const menuService: MenuService = {
	/**
	 * Refreshes the application menu with the current state.
	 * @param ctx The core context of the application.
	 */
	refresh: async (ctx: CoreContext): Promise<void> => {
		const { $appWindow, $config } = ctx;
		if (!$appWindow || $appWindow.isDestroyed() || !$config) { return; }

		const sessionAge = ctx.getSessionAge();
		let cacheSize = 0;
		// Prefer the test layer session since it shares the partition with test content
		const webContents = ctx.$testLayer?.webContents || $appWindow.webContents;
		try {
			if (webContents && !webContents.isDestroyed()) {
				cacheSize = await webContents.session.getCacheSize();
			}
		} catch {
			// ignore
		}

		const viewportItems = menuService.getViewportMenuItems(ctx);
		const linkItems = menuService.getLinkMenuItems($config, {
			navigate: (path, openInBrowser) => ctx.navigate(path, openInBrowser),
			navigateVariable: url => ctx.navigateVariable(url)
		});

		const context = menuService.getContext(ctx, {
			sessionAge,
			cacheSize,
			viewportItems,
			linkItems
		});

		const template = buildMenuTemplate(context);
		Menu.setApplicationMenu(Menu.buildFromTemplate(template));
	},

	/**
	 * Builds the list of viewport menu items based on the current configuration and viewport.
	 * @param ctx The core context of the application.
	 * @returns An array of menu item objects for the viewport submenu.
	 */
	getViewportMenuItems: (ctx: CoreContext): MenuTemplate => {
		const { $appWindow, $allViewports, $currentViewport } = ctx;
		if (!$appWindow || $appWindow.isDestroyed()) { return []; }

		const tolerance = 2;
		const viewportItems: MenuTemplate = [];
		let defaultsFound = false;

		$allViewports.forEach(res => {
			const [width, height] = $currentViewport || [];
			const isSizeMatch = Math.abs(res.width - width) <= tolerance && Math.abs(res.height - height) <= tolerance;
			if (!defaultsFound && res.isDefault) {
				viewportItems.push({ type: `separator` });
				defaultsFound = true;
			}
			viewportItems.push({
				label: `${isSizeMatch ? `🔘 ` : ``}${res.label} (${res.width} x ${res.height})`,
				click: () => $appWindow.setContentSize(res.width, res.height)
			});
		});

		if ($currentViewport.length === 2 && !$allViewports.some(res => Math.abs(res.width - $currentViewport[0]) <= tolerance && Math.abs(res.height - $currentViewport[1]) <= tolerance)) {
			viewportItems.unshift(
				{ label: `🔘 Current (${$currentViewport[0]} x ${$currentViewport[1]})`, click: () => $appWindow.setContentSize($currentViewport[0], $currentViewport[1]) },
				{ type: `separator` }
			);
		}

		return viewportItems;
	},

	/**
	 * Builds the list of link menu items from the configuration.
	 * @param config The validated configuration.
	 * @param handlers Handlers for navigation.
	 * @returns An array of menu item objects for the links submenu.
	 */
	getLinkMenuItems: (config: ValidatedConfig | null, handlers: LinkMenuHandlers): MenuTemplate => {
		if (!config) { return []; }

		const linkItems: MenuTemplate = [];
		config.links.forEach((item: LinkConfig) => {
			const itemUrl = item.url;
			let isValid;
			let validUrl: DomainUrl | undefined;
			const hasVariables = itemUrl.match(/{[^{}]+}/g)?.length;
			if (hasVariables) {
				isValid = isVariableLinkValid(itemUrl);
			} else {
				validUrl = parseURL(itemUrl)?.toString() as DomainUrl;
				isValid = !!validUrl;
			}
			linkItems.push({
				label: `${item.external ? `🌐 ` : ``}${item.label || item.url}${isValid ? `` : ` (invalid entry: "${item.url}")`}`,
				click: () => hasVariables ? handlers.navigateVariable(itemUrl) : handlers.navigate(validUrl, item.external),
				enabled: isValid
			});
		});

		return linkItems;
	},

	/**
	 * Assembles the menu context object required for building the application menu template.
	 * @param ctx The core context of the application.
	 * @param params Data required to build the context.
	 * @returns The fully assembled MenuContext object.
	 */
	getContext: (ctx: CoreContext, params: MenuContextParams): MenuContext => {
		const { sessionAge, cacheSize, viewportItems, linkItems } = params;

		return {
			appName: `Eyas`,
			isDev: process.argv.includes(`--dev`),
			testNetworkEnabled: ctx.$testNetworkEnabled,
			sessionAge,
			cacheSize,
			viewportItems,
			linkItems,
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
		startAFreshTest: (): Promise<void> => ctx.startAFreshTest(true),
		toggleNetwork: (): void => {
			if (ctx.$isInitializing) return;
			ctx.setTestNetworkEnabled(!ctx.$testNetworkEnabled);
			ctx.setMenu();
		},
		clearCache: (): void => { ctx.clearCache(); },
		openCacheFolder: (): void => {
			if (!ctx.$appWindow || ctx.$appWindow.isDestroyed()) { return; }
			const storagePath = ctx.$appWindow.webContents.session.getStoragePath();
			if (storagePath) {
				shell.openPath(storagePath);
			}
		},
		refreshMenu: (): Promise<void> => ctx.setMenu(),
		updateStatus: (ctx.updateService.getStatus() as `idle` | `downloading` | `downloaded`) || `idle`,
		onCheckForUpdates: (): void => ctx.updateService.checkForUpdates(),
		onInstallUpdate: (): void => ctx.updateService.installUpdate(),
		toggleTestDevTools: (): void => {
			const webContents = (ctx.$testLayer || ctx.$appWindow)?.webContents;
			if (webContents && !webContents.isDestroyed()) {
				webContents.toggleDevTools();
			}
		},
		openUiDevTools: (): void => {
			if (ctx.$eyasLayer && !ctx.$eyasLayer.webContents.isDestroyed()) {
				ctx.$eyasLayer.webContents.openDevTools({ mode: `detach` });
			}
		}
	})
};
