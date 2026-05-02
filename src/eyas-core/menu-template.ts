import type { MenuContext, MenuTemplate } from '@registry/menu.js';

/**
 * Builds the application menu template (array of descriptors for Menu.buildFromTemplate).
 * Pure function: no Electron or DOM; all behavior via context callbacks.
 * @param {MenuContext} context - Menu data and callbacks
 * @returns {MenuTemplate} Menu template array
 */
export function buildMenuTemplate(context: MenuContext): MenuTemplate {
	const {
		appName,
		isDev,
		isConfigLoaded = false,
		updateStatus = `idle`,
		onInstallUpdate
	} = context;

	// ── Assemble root menu ────────────────────────────────────────────────────
	const menu: MenuTemplate = [
		{ label: `&${appName}`, submenu: createAppSubmenu(context) },
		{ label: `🧪 &Test`, enabled: isConfigLoaded, submenu: createTestSubmenu(context) },
		{ label: `🌐 &Browser`, enabled: isConfigLoaded, submenu: createBrowserSubmenu(context) },
		{ label: `🔧 &Development Tools`, enabled: isConfigLoaded || isDev, submenu: createToolsSubmenu(context) }
	];

	if (updateStatus === `downloaded`) {
		menu.push({
			label: `⬆️ Update available – Restart to install`,
			click: onInstallUpdate
		});
	}

	return menu;
}

/**
 * Creates the "App" submenu (Eyas/About/Settings/etc).
 */
function createAppSubmenu(context: MenuContext): MenuTemplate {
	const {
		updateStatus,
		onCheckForUpdates
	} = context;

	const updateStatusItem = updateStatus === `downloading`
		? { label: `⬆️ Downloading update...`, enabled: false }
		: { label: `⬆️ Check for updates`, click: onCheckForUpdates };

	return [
		updateStatusItem
	];
}

/**
 * Creates the "Test" submenu.
 */
function createTestSubmenu(context: MenuContext): MenuTemplate {
	const {
		isConfigLoaded = false,
		isEnvironmentPending = false,
		startAFreshTest,
		linkItems
	} = context;

	const enabled = isConfigLoaded && !isEnvironmentPending;
	const submenu: MenuTemplate = [
		{ label: `🔄 &Reset Test Environment`, click: startAFreshTest, enabled }
	];

	if (linkItems.length) {
		submenu.push({ type: `separator` });
		submenu.push({ label: `🔗 &Links`, submenu: linkItems, enabled });
	}

	return submenu;
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


