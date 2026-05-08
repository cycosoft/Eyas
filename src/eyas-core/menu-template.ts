import type { MenuContext, MenuTemplate } from '@registry/menu.js';

/**
 * Builds the application menu template (array of descriptors for Menu.buildFromTemplate).
 * Pure function: no Electron or DOM; all behavior via context callbacks.
 * @param {MenuContext} context - Menu data and callbacks
 * @returns {MenuTemplate} Menu template array
 */
export function buildMenuTemplate(context: MenuContext): MenuTemplate {
	const {
		isDev,
		isConfigLoaded = false
	} = context;

	const menu: MenuTemplate = [
		{ label: `🌐 &Browser`, enabled: isConfigLoaded, submenu: createBrowserSubmenu(context) },
		{ label: `🔧 &Development Tools`, enabled: isConfigLoaded || isDev, submenu: createToolsSubmenu(context) }
	];

	return menu;
}

/**
 * Creates the "Browser" submenu.
 */
function createBrowserSubmenu(context: MenuContext): MenuTemplate {
	const {
		isConfigLoaded = false,
		isInitializing = false,
		copyUrl
	} = context;

	const enabled = isConfigLoaded && !isInitializing;

	return [
		{ label: `📋 &Copy URL`, click: copyUrl, enabled }
	];
}

/**
 * Creates the "Development Tools" submenu.
 */
function createToolsSubmenu(context: MenuContext): MenuTemplate {
	const {
		isConfigLoaded = false,
		testNetworkEnabled,
		toggleNetwork
	} = context;

	return [
		{ label: `${testNetworkEnabled ? `🚫 &Go Offline` : `📶 &Go Online`}`, click: toggleNetwork, enabled: isConfigLoaded }
	];
}


