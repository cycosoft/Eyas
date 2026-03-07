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
		onOpenSettings = () => { },
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
		testServerActive = false,
		testServerRemainingTime = ``,
		onStartTestServer,
		onStopTestServer,
		onCopyTestServerUrl,
		onOpenTestServerInBrowser,
		isInitializing = false
	} = context;

	const getTestServerSubmenu = () => [
		{ label: `🛑 &Stop Live Test Server`, click: onStopTestServer },
		{ label: `📋 &Copy Live Test Server URL`, click: onCopyTestServerUrl },
		{ label: `🌐 &Open in Browser`, click: onOpenTestServerInBrowser }
	];

	const testServerLabel = testServerActive
		? `📡 Test Server running for ~${testServerRemainingTime}`
		: `📡 Live Test Server`;

	const updateStatusItem = updateStatus === `downloading`
		? { label: `⬆️ Downloading update...`, enabled: false }
		: { label: `⬆️ Check for updates`, click: onCheckForUpdates };

	// ── 1. Eyas ─────────────────────────────────────────────────────────────
	const appSubmenu = [
		{ label: `ℹ️ &About`, click: showAbout },
		{ label: `⚙️ &Settings`, click: onOpenSettings },
		updateStatusItem,
		{ type: `separator` },
		{ label: `🚪 &Exit`, accelerator: `CmdOrCtrl+Q`, click: quit }
	];

	// ── 2. Test ──────────────────────────────────────────────────────────────
	const testSubmenu = [
		{ label: `🔄 &Choose Test Environment`, click: startAFreshTest, enabled: !isInitializing }
	];

	testSubmenu.push({ label: `🏠 Test &Home`, click: navigateHome, enabled: !isInitializing });

	if (linkItems.length) {
		testSubmenu.push({ type: `separator` });
		testSubmenu.push({ label: `🔗 &Links`, submenu: linkItems });
	}

	testSubmenu.push({ type: `separator` });

	if (testServerActive && onStopTestServer && onCopyTestServerUrl && onOpenTestServerInBrowser) {
		testSubmenu.push({
			label: testServerLabel,
			enabled: !isInitializing,
			submenu: getTestServerSubmenu()
		});
	} else {
		testSubmenu.push({ label: `📡 Live Test Server`, click: onStartTestServer, enabled: !isInitializing });
	}

	// ── 3. Browser ───────────────────────────────────────────────────────────
	const browserSubmenu = [
		{ label: `🔄 &Reload`, accelerator: `CmdOrCtrl+R`, click: reload, enabled: !isInitializing },
		{ label: `⬅️ &Back`, accelerator: `CmdOrCtrl+Left`, click: back, enabled: !isInitializing },
		{ label: `➡️ &Forward`, accelerator: `CmdOrCtrl+Right`, click: forward, enabled: !isInitializing },
		{ type: `separator` },
		{ label: `📐 &Viewport`, submenu: viewportItems }
	];

	// ── 4. Tools ─────────────────────────────────────────────────────────────
	const cacheSubmenu = [
		{ label: `⏳ Age: ${sessionAge}`, click: refreshMenu, enabled: !isInitializing },
		{ label: `💾 Size: ${cacheSize} bytes`, click: refreshMenu, enabled: !isInitializing },
		{ label: `🗑️ &Clear`, click: clearCache, enabled: !isInitializing },
		...(isDev ? [{ label: `📂 Open Cache Folder`, click: openCacheFolder, enabled: !isInitializing }] : [])
	];

	const toolsSubmenu = [
		{ label: `📋 &Copy URL`, click: copyUrl, enabled: !isInitializing },
		{ label: `${testNetworkEnabled ? `🚫 &Go Offline` : `📶 &Go Online`}`, click: toggleNetwork, enabled: !isInitializing },
		{ type: `separator` },
		{ label: `📦 &Cache`, submenu: cacheSubmenu },
		{ type: `separator` },
		{ role: `toggleDevTools`, accelerator: `F12`, label: `⚙️ &Developer Tools${isDev ? ` (Test)` : ``}` }
	];

	if (isDev) {
		toolsSubmenu.push({
			label: `⚙️ Developer Tools (&UI)`,
			accelerator: `CmdOrCtrl+Shift+J`,
			click: openUiDevTools
		});
	}

	// ── Assemble root menu ────────────────────────────────────────────────────
	const menu = [
		{ label: `&${appName}`, submenu: appSubmenu },
		{ label: `🧪 &Test`, enabled: !isInitializing, submenu: testSubmenu },
		{ label: `🌐 &Browser`, enabled: !isInitializing, submenu: browserSubmenu },
		{ label: `🔧 &Developer Tools`, enabled: !isInitializing, submenu: toolsSubmenu }
	];

	// Floating test server status item at far right (retained)
	if (testServerActive) {
		menu.push({
			label: testServerLabel,
			submenu: getTestServerSubmenu()
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
