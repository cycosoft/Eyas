const { _electron: electron, expect } = require(`@playwright/test`);
const path = require(`path`);

/**
 * Launches the Eyas application and waits for the initial window.
 * @param {string[]} extraArgs
 * @returns {Promise<import('@playwright/test').ElectronApplication>}
 */
async function launchEyas(extraArgs = []) {
	const electronPath = require(`electron`);
	const mainPath = path.join(__dirname, `../../.build/index.js`);

	const electronApp = await electron.launch({
		executablePath: electronPath,
		args: [mainPath, `--dev`, ...extraArgs],
		timeout: 30000
	});

	const window = await electronApp.firstWindow();
	await window.waitForLoadState(`domcontentloaded`);

	// Give the app a moment to initialize its layers
	await new Promise(resolve => setTimeout(resolve, 1000));

	return electronApp;
}

/**
 * Finds the UI Page object (running in a BrowserView).
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @returns {Promise<import('@playwright/test').Page>}
 */
async function getUiView(electronApp) {
	let ui;
	for (let i = 0; i < 20; i++) {
		ui = electronApp.windows().find(p => p.url().startsWith(`ui://eyas.interface`));
		if (ui) break;
		await new Promise(resolve => setTimeout(resolve, 500));
	}
	return ui;
}

/**
 * Ensures an environment is selected, clearing the modal if it's visible.
 * @param {import('@playwright/test').Page} uiPage
 */
async function ensureEnvironmentSelected(uiPage) {
	const envModalTitle = uiPage.locator(`[data-qa="environment-modal-title"]`);

	// Wait up to 5s for the modal to potentially appear
	try {
		await expect(envModalTitle).toBeVisible({ timeout: 5000 });
		await uiPage.locator(`[data-qa="btn-env"]`).first().click();
		await expect(envModalTitle).not.toBeVisible();
		// Wait for navigation/menu update
		await new Promise(resolve => setTimeout(resolve, 1000));
	} catch {
		// Modal might not be required or already cleared
	}
}

/**
 * Wait for the menu to update by polling.
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @param {Function} predicate
 */
async function waitForMenuUpdate(electronApp, predicate) {
	for (let i = 0; i < 20; i++) {
		const menu = await getMenuStructure(electronApp);
		if (menu && predicate(menu)) return menu;
		await new Promise(resolve => setTimeout(resolve, 500));
	}
	throw new Error(`Menu did not update as expected`);
}

/**
 * Exits the Eyas application cleanly by sending the app-exit IPC message.
 * @param {import('@playwright/test').ElectronApplication} electronApp
 */
async function exitEyas(electronApp) {
	try {
		await electronApp.evaluate(({ BrowserWindow }) => {
			const windows = BrowserWindow.getAllWindows();
			if (windows.length > 0) {
				const mainWindow = windows[0];
				const browserViews = mainWindow.getBrowserViews();
				if (browserViews.length > 0) {
					browserViews[0].webContents.executeJavaScript(`
						if (window.eyas && window.eyas.send) {
							window.eyas.send('app-exit');
						}
					`).catch(() => {});
				}
			}
		});
		// Wait a bit for the app to process the exit
		await new Promise(resolve => setTimeout(resolve, 1000));
	} catch {
		// ignore
	} finally {
		await electronApp.close().catch(() => {});
	}
}

/**
 * Serializes the application menu.
 * @param {import('@playwright/test').ElectronApplication} electronApp
 */
async function getMenuStructure(electronApp) {
	return electronApp.evaluate(({ Menu }) => {
		const appMenu = Menu.getApplicationMenu();
		if (!appMenu) return null;
		function toPlain(menu) {
			return menu.items.map(item => ({
				label: item.label || ``,
				enabled: item.enabled,
				submenu: item.submenu ? toPlain(item.submenu) : undefined
			}));
		}
		return toPlain(appMenu);
	});
}

/**
 * Clicks a sub-menu item.
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @param {string} topLevelLabel
 * @param {string} subMenuLabel
 */
async function clickSubMenuItem(electronApp, topLevelLabel, subMenuLabel) {
	return electronApp.evaluate(({ Menu }, { topLevelLabel, subMenuLabel }) => {
		const appMenu = Menu.getApplicationMenu();
		if (!appMenu) return false;

		const topLevelItem = appMenu.items.find(item => item.label && item.label.includes(topLevelLabel));
		if (!topLevelItem || !topLevelItem.submenu) return false;

		const subMenuItem = topLevelItem.submenu.items.find(item => item.label && item.label.includes(subMenuLabel));
		if (subMenuItem && subMenuItem.click) {
			subMenuItem.click(subMenuItem, null, {});
			return true;
		}
		return false;
	}, { topLevelLabel, subMenuLabel });
}

module.exports = {
	launchEyas,
	getUiView,
	ensureEnvironmentSelected,
	waitForMenuUpdate,
	exitEyas,
	getMenuStructure,
	clickSubMenuItem
};
