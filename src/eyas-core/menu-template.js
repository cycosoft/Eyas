'use strict';

/**
 * Builds the application menu template (array of descriptors for Menu.buildFromTemplate).
 * Pure function: no Electron or DOM; all behavior via context callbacks.
 * @param {object} context - Menu data and callbacks
 * @returns {object[]} Menu template array
 */
function buildMenuTemplate(context) {
	const {
		appName,
		isDev,
		testNetworkEnabled,
		sessionAge,
		cacheSize,
		showAbout,
		quit,
		startAFreshTest,
		copyUrl,
		openUiDevTools,
		navigateHome,
		reload,
		back,
		forward,
		toggleNetwork,
		clearCache,
		openCacheFolder,
		refreshMenu,
		viewportItems,
		linkItems,
		updateStatus = `idle`,
		onCheckForUpdates,
		onInstallUpdate,
		exposeActive = false,
		exposeRemainingMinutes = 0,
		onStartExpose,
		onStopExpose,
		onCopyExposedUrl,
		onOpenExposedInBrowser,
		isInitializing = false
	} = context;

	const getExposeSubmenu = () => [
		{ label: `🛑 &Stop Expose`, click: onStopExpose },
		{ label: `📋 &Copy Exposed URL`, click: onCopyExposedUrl },
		{ label: `🌐 &Open in Browser`, click: onOpenExposedInBrowser }
	];

	const exposeLabel = exposeActive
		? `📡 Exposed for ~${exposeRemainingMinutes}m`
		: `📡 Expose Test`;

	const updateStatusItem = updateStatus === `downloading`
		? { label: `⬆️ Downloading update...`, enabled: false }
		: { label: `⬆️ Check for updates`, click: onCheckForUpdates };

	const appSubmenu = [
		{ label: `ℹ️ &About`, click: showAbout },
		updateStatusItem,
		{ type: `separator` },
		{ label: `🚪 &Exit`, accelerator: `CmdOrCtrl+Q`, click: quit }
	];

	const toolsSubmenu = [
		{ label: `🔄 &Restart Test`, click: startAFreshTest, enabled: !isInitializing },
		{ label: `📋 &Copy URL`, click: copyUrl, enabled: !isInitializing },
		{ type: `separator` }
	];

	if (exposeActive && onStopExpose && onCopyExposedUrl && onOpenExposedInBrowser) {
		toolsSubmenu.push({
			label: exposeLabel,
			enabled: !isInitializing,
			submenu: getExposeSubmenu()
		});
	} else {
		toolsSubmenu.push({ label: `📡 Expose Test`, click: onStartExpose, enabled: !isInitializing });
	}

	toolsSubmenu.push({ type: `separator` });
	toolsSubmenu.push({ role: `toggleDevTools`, accelerator: `F12`, label: `⚙️ &Developer Tools${isDev ? ` (Test)` : ``}` });

	const menu = [
		{ label: `&${appName}`, submenu: appSubmenu },
		{
			label: `🔧 &Tools`,
			enabled: !isInitializing,
			submenu: toolsSubmenu
		}
	];

	if (isDev) {
		menu[1].submenu.push({
			label: `⚙️ Developer Tools (&UI)`,
			accelerator: `CmdOrCtrl+Shift+J`,
			click: openUiDevTools
		});
	}

	menu.push({
		label: `${testNetworkEnabled ? `📶` : `🚫`} &Network`,
		enabled: !isInitializing,
		submenu: [
			{ label: `🏠 Test &Home`, click: navigateHome, enabled: !isInitializing },
			{ type: `separator` },
			{ label: `🔄 &Reload`, accelerator: `CmdOrCtrl+R`, click: reload, enabled: !isInitializing },
			{ label: `⬅️ &Back`, accelerator: `CmdOrCtrl+Left`, click: back, enabled: !isInitializing },
			{ label: `➡️ &Forward`, accelerator: `CmdOrCtrl+Right`, click: forward, enabled: !isInitializing },
			{ type: `separator` },
			{ label: `${testNetworkEnabled ? `🚫 &Go Offline` : `📶 &Go Online`}`, click: toggleNetwork, enabled: !isInitializing }
		]
	});

	menu.push({
		label: `📦 &Cache`,
		enabled: !isInitializing,
		submenu: [
			{ label: `⏳ Age: ${sessionAge}`, click: refreshMenu, enabled: !isInitializing },
			{ label: `💾 Size: ${cacheSize} bytes`, click: refreshMenu, enabled: !isInitializing },
			{ label: `🗑️ &Clear`, click: clearCache, enabled: !isInitializing },
			...(isDev ? [{ label: `📂 Open Cache Folder`, click: openCacheFolder, enabled: !isInitializing }] : [])
		]
	});

	menu.push({ label: `📐 &Viewport`, submenu: viewportItems });

	if (linkItems.length) {
		menu.push({ label: `🔗 &Links`, submenu: linkItems });
	}

	if (exposeActive) {
		menu.push({
			label: exposeLabel,
			submenu: getExposeSubmenu()
		});
	}

	if (updateStatus === `downloaded`) {
		menu.push({
			label: `⬆️ Update available – Restart to install`,
			click: onInstallUpdate
		});
	}

	return menu;
}

module.exports = { buildMenuTemplate };
