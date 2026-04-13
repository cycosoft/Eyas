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
		onShowWhatsNew = () => { },
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
		onStartTestServer,
		toggleTestDevTools,
		isInitializing = false,
		isConfigLoaded = false,
		isEnvironmentPending = false
	} = context;


	const updateStatusItem = updateStatus === `downloading`
		? { label: `⬆️ Downloading update...`, enabled: false }
		: { label: `⬆️ Check for updates`, click: onCheckForUpdates };

	// ── 1. Eyas ─────────────────────────────────────────────────────────────
	const appSubmenu = [
		{ label: `ℹ️ &About`, click: showAbout },
		{ label: `⚙️ &Settings`, click: onOpenSettings },
		{ label: `✨ &Changelog`, click: onShowWhatsNew },
		updateStatusItem,
		{ type: `separator` },
		{ label: `🚪 &Exit`, accelerator: `CmdOrCtrl+Q`, click: quit }
	];

	// ── 2. Test ──────────────────────────────────────────────────────────────
	const testSubmenu = [
		{ label: `🔄 &Reset Test Environment`, click: startAFreshTest, enabled: isConfigLoaded && !isEnvironmentPending }
	];

	testSubmenu.push({ label: `🏠 Test &Home`, click: navigateHome, enabled: isConfigLoaded && !isEnvironmentPending });

	if (linkItems.length) {
		testSubmenu.push({ type: `separator` });
		testSubmenu.push({ label: `🔗 &Links`, submenu: linkItems, enabled: isConfigLoaded && !isEnvironmentPending });
	}

	testSubmenu.push({ type: `separator` });

	testSubmenu.push({
		label: `📡 Live Test Server`,
		click: onStartTestServer,
		enabled: isConfigLoaded && !isEnvironmentPending && !isInitializing && !testServerActive
	});

	// ── 3. Browser ───────────────────────────────────────────────────────────
	const browserSubmenu = [
		{ label: `📋 &Copy URL`, click: copyUrl, enabled: isConfigLoaded && !isInitializing },
		{ type: `separator` },
		{ label: `🔄 &Reload`, accelerator: `CmdOrCtrl+R`, click: reload, enabled: isConfigLoaded && !isInitializing },
		{ label: `◀️ &Back`, accelerator: `CmdOrCtrl+Left`, click: back, enabled: isConfigLoaded && !isInitializing },
		{ label: `▶️ &Forward`, accelerator: `CmdOrCtrl+Right`, click: forward, enabled: isConfigLoaded && !isInitializing },
		{ type: `separator` },
		{ label: `📐 &Viewport`, submenu: viewportItems }
	];

	// ── 4. Tools ─────────────────────────────────────────────────────────────
	const cacheSubmenu = [
		{ label: `⏳ Age: ${sessionAge}`, click: refreshMenu },
		{ label: `💾 Size: ${cacheSize} bytes`, click: refreshMenu },
		{ label: `🗑️ &Clear`, click: clearCache },
		...(isDev ? [{ label: `📂 Open Cache Folder`, click: openCacheFolder }] : [])
	];

	const toolsSubmenu = [
		{ label: `${testNetworkEnabled ? `🚫 &Go Offline` : `📶 &Go Online`}`, click: toggleNetwork, enabled: isConfigLoaded },
		{ type: `separator` },
		{ label: `📦 &Cache`, submenu: cacheSubmenu, enabled: isConfigLoaded },
		{ type: `separator` },
		{
			label: `⚙️ &Developer Tools${isDev ? ` (Test)` : ``}`,
			accelerator: `F12`,
			click: toggleTestDevTools,
			enabled: isConfigLoaded
		}
	];

	if (isDev) {
		toolsSubmenu.push({
			label: `⚙️ Developer Tools (&eyas)`,
			accelerator: `CmdOrCtrl+Shift+J`,
			click: openUiDevTools
		});
	}

	// ── Assemble root menu ────────────────────────────────────────────────────
	const menu = [
		{ label: `&${appName}`, submenu: appSubmenu },
		{ label: `🧪 &Test`, enabled: isConfigLoaded, submenu: testSubmenu },
		{ label: `🌐 &Browser`, enabled: isConfigLoaded, submenu: browserSubmenu },
		{ label: `🔧 &Development Tools`, enabled: isConfigLoaded || isDev, submenu: toolsSubmenu }
	];


	if (updateStatus === `downloaded`) {
		menu.push({
			label: `⬆️ Update available – Restart to install`,
			click: onInstallUpdate
		});
	}

	return menu;
}

export { buildMenuTemplate };

