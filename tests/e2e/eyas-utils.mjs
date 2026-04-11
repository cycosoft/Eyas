import { _electron as electron, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fs = require('fs-extra');
const electronPath = require('electron');

/**
 * Launches the Eyas application and waits for the initial window.
 * @param {string[]} extraArgs
 * @param {string} [userDataDir] - Optional user data directory to use
 * @param {string} [cwd] - Optional working directory to launch from (determines which project config is loaded)
 * @param {object} [env] - Optional environment variable overrides
 * @returns {Promise<import('@playwright/test').ElectronApplication>}
 */
export async function launchEyas(extraArgs = [], userDataDir = null, cwd = null, env = {}) {
	const mainPath = path.join(__dirname, `../../out/main/index.js`);

	// Use a temporary directory for each test run to ensure isolation
	if (!userDataDir) {
		userDataDir = path.join(__dirname, `../../.test-data`, `user-data-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
	}

	// Ensure the directory exists
	await fs.ensureDir(userDataDir);

	const electronApp = await electron.launch({
		executablePath: electronPath,
		cwd: cwd || process.cwd(),
		env: { ...process.env, ...env },
		args: [
			mainPath,
			`--dev`,
			`--user-data-dir=${userDataDir}`,
			// bypass What's New by default during tests unless explicitly requested
			...(extraArgs.includes(`--show-whats-new`) ? [] : [`--skip-whats-new`]),
			...extraArgs.filter(a => a !== `--show-whats-new`)
		],
		timeout: 30000
	});

	// Store the user data dir on the app object for later reuse if needed
	electronApp._userDataDir = userDataDir;

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
export async function getUiView(electronApp) {
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
export async function ensureEnvironmentSelected(uiPage) {
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
export async function waitForMenuUpdate(electronApp, predicate) {
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
export async function exitEyas(electronApp) {
	if (!electronApp) return;

	// Get the PID now, before any teardown, via Electron's own main process.
	let electronPid = null;
	try {
		electronPid = await electronApp.evaluate(() => process.pid);
	} catch { /* ignore — app may already be shutting down */ }

	try {
		await electronApp.evaluate(({ ipcMain }) => {
			if (ipcMain && ipcMain.emit) {
				ipcMain.emit(`app-exit`);
			}
		});
		// Wait a bit for the app to process the exit
		await new Promise(resolve => setTimeout(resolve, 1000));
	} catch {
		// ignore
	} finally {
		await electronApp.close().catch(() => { });
		// Forcefully kill the process to ensure the single-instance lock is released
		// before any subsequent launch in the same test run.
		if (electronPid) {
			try { process.kill(electronPid, `SIGKILL`); } catch { /* ignore — may already be gone */ }
		}
	}
}

/**
 * Serializes the application menu.
 * @param {import('@playwright/test').ElectronApplication} electronApp
 */
export async function getMenuStructure(electronApp) {
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
export async function clickSubMenuItem(electronApp, topLevelLabel, subMenuLabel) {
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

/**
 * Emits an IPC message directly to the Electron main process.
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @param {string} channel
 * @param {any} args
 */
export async function emitIpcMessage(electronApp, channel, ...args) {
	return electronApp.evaluate(({ ipcMain }, { channel, args }) => {
		ipcMain.emit(channel, {}, ...args);
	}, { channel, args });
}

/**
 * Gets the current URL of the main application window.
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @returns {Promise<string>}
 */
export async function getAppWindowUrl(electronApp) {
	return electronApp.evaluate(({ BrowserWindow }) => {
		const windows = BrowserWindow.getAllWindows();
		return windows.length > 0 ? windows[0].webContents.getURL() : ``;
	});
}

/**
 * Executes a string of JavaScript on the UI layer.
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @param {string} script
 */
export async function runUiScript(electronApp, script) {
	return electronApp.evaluate(({ BrowserWindow }, script) => {
		const windows = BrowserWindow.getAllWindows();
		if (windows.length > 0) {
			const browserViews = windows[0].getBrowserViews();
			if (browserViews.length > 0) {
				return browserViews[0].webContents.executeJavaScript(script);
			}
		}
	}, script);
}
