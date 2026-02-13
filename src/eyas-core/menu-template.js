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
		exposeHttpsEnabled = false,
		onToggleExposeHttps
	} = context;

	const exposeLabel = exposeActive
		? `📡 Exposed for ~${exposeRemainingMinutes}m`
		: `📡 Expose Test`;

	const exposeMenuItem = {
		label: exposeLabel
	};

	if (exposeActive && onStopExpose && onCopyExposedUrl && onOpenExposedInBrowser) {
		exposeMenuItem.submenu = [
			{ label: `🛑 &Stop Expose`, click: onStopExpose },
			{ label: `📋 &Copy Exposed URL`, click: onCopyExposedUrl },
			{ label: `🌐 &Open in Browser`, click: onOpenExposedInBrowser }
		];
	} else {
		exposeMenuItem.submenu = [
			{ label: `📡 Expose Test`, click: onStartExpose }
		];
		exposeMenuItem.click = onStartExpose;
	}

	const updateStatusItem = updateStatus === `downloading`
		? { label: `⬆️ Downloading update...`, enabled: false }
		: { label: `⬆️ Check for updates`, click: onCheckForUpdates };

	const appSubmenu = [
		{ label: `ℹ️ &About`, click: showAbout },
		updateStatusItem,
		{ type: `separator` },
		{ label: `🚪 &Exit`, accelerator: `CmdOrCtrl+Q`, click: quit }
	];

	const menu = [
		{ label: `&${appName}`, submenu: appSubmenu },
		{
			label: `🔧 &Tools`,
			submenu: [
				{ label: `🔄 &Restart Test`, click: startAFreshTest },
				{ label: `📋 &Copy URL`, click: copyUrl },
				...(typeof onToggleExposeHttps === `function` ? [{ type: `separator` }, { label: exposeHttpsEnabled ? `🔒 HTTPS for Expose` : `🔒 Enable HTTPS for Expose`, click: onToggleExposeHttps }] : []),
				{ type: `separator` },
				{ role: `toggleDevTools`, accelerator: `F12`, label: `⚙️ &Developer Tools${isDev ? ` (Test)` : ``}` }
			]
		}
	];

	if (isDev) {
		menu[1].submenu.push({
			label: `⚙️ Developer Tools (&UI)`,
			accelerator: `CmdOrCtrl+Shift+J`,
			click: openUiDevTools
		});
	}

	menu.push(exposeMenuItem);

	menu.push({
		label: `${testNetworkEnabled ? `📶` : `🚫`} &Network`,
		submenu: [
			{ label: `🏠 Test &Home`, click: navigateHome },
			{ type: `separator` },
			{ label: `🔄 &Reload`, accelerator: `CmdOrCtrl+R`, click: reload },
			{ label: `⬅️ &Back`, accelerator: `CmdOrCtrl+Left`, click: back },
			{ label: `➡️ &Forward`, accelerator: `CmdOrCtrl+Right`, click: forward },
			{ type: `separator` },
			{ label: `${testNetworkEnabled ? `🚫 &Go Offline` : `📶 &Go Online`}`, click: toggleNetwork }
		]
	});

	menu.push({
		label: `📦 &Cache`,
		submenu: [
			{ label: `⏳ Age: ${sessionAge}`, click: refreshMenu },
			{ label: `💾 Size: ${cacheSize} bytes`, click: refreshMenu },
			{ label: `🗑️ &Clear`, click: clearCache },
			...(isDev ? [{ label: `📂 Open Cache Folder`, click: openCacheFolder }] : [])
		]
	});

	menu.push({ label: `📐 &Viewport`, submenu: viewportItems });

	if (linkItems.length) {
		menu.push({ label: `🔗 &Links`, submenu: linkItems });
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
