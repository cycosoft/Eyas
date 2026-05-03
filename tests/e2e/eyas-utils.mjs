import { _electron as electron, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import fs from 'fs-extra';

/* eslint-disable import/no-commonjs */
export const electronPath = require(`electron`);
/* eslint-enable import/no-commonjs */

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

	// Pipe console messages from the UI layer
	const uiView = await getUiView(electronApp);
	if (uiView) {
		uiView.on(`console`, msg => console.log(`[UI CONSOLE]: ${msg.text()}`));
	}

	// Ensure at least one window is open and the application menu is initialized
	// with our custom items before returning to the test.
	for (let i = 0; i < 20; i++) {
		const hasWindow = electronApp.windows().length > 0;
		const hasCustomMenu = await electronApp.evaluate(({ Menu }) => {
			const menu = Menu.getApplicationMenu();
			return menu && menu.items.some(item => item.label.includes(`Test`));
		}).catch(() => false);

		if (hasWindow && hasCustomMenu) break;
		await new Promise(resolve => setTimeout(resolve, 250));
	}

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
		ui = electronApp.windows().find(p => p.url().includes(`index.html`) || p.url().includes(`localhost`));
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

	// Wait up to 2s for the modal to potentially appear
	try {
		await expect(envModalTitle).toBeVisible({ timeout: 2000 });
		await uiPage.locator(`[data-qa="btn-env"]`).first().click();
		await expect(envModalTitle).not.toBeVisible();
		// Wait for the app header to be visible, which indicates the navigation finished
		await expect(uiPage.locator(`[data-qa="app-header"]`)).toBeVisible({ timeout: 10000 });
	} catch {

		// Modal might not be required or already cleared
	}
}

/**
 * Opens the Settings modal via the header menu.
 * @param {import('@playwright/test').Page} uiPage
 */
export async function openSettingsModal(uiPage) {
	// Click the 'File' menu (which uses the logo)
	const fileMenuBtn = uiPage.locator(`[data-qa="btn-nav-group-file"]`);
	await expect(fileMenuBtn).toBeVisible({ timeout: 10000 });
	await fileMenuBtn.click();

	// Find and click the 'App/Project Settings' item
	const settingsMenuItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `App/Project Settings` });
	await expect(settingsMenuItem).toBeVisible({ timeout: 5000 });
	await settingsMenuItem.click();
}

/**
 * Opens the Changelog modal via the header menu.
 * @param {import('@playwright/test').Page} uiPage
 */
export async function openChangelogModal(uiPage) {
	// Click the 'File' menu
	const fileMenuBtn = uiPage.locator(`[data-qa="btn-nav-group-file"]`);
	await expect(fileMenuBtn).toBeVisible({ timeout: 10000 });
	await fileMenuBtn.click();

	// Find and click the 'Changelog' item
	const changelogMenuItem = uiPage.locator(`[data-qa="btn-nav-item"]`, { hasText: `Changelog` });
	await expect(changelogMenuItem).toBeVisible({ timeout: 5000 });
	await changelogMenuItem.click();
}

/**
 * Wait for the menu to update by polling.
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @param {Function} predicate
 */
export async function waitForMenuUpdate(electronApp, predicate) {
	for (let i = 0; i < 60; i++) {
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
	} catch {
		// ignore
	} finally {
		await electronApp.close().catch(() => { });

		// Forcefully kill the process to ensure the single-instance lock is released
		// before any subsequent launch in the same test run.
		if (electronPid) {
			try { process.kill(electronPid, `SIGKILL`); } catch { /* ignore */ }

			// Wait for the process to actually disappear (up to 2s)
			// to avoid ENOTEMPTY errors when cleaning up test data directories.
			for (let i = 0; i < 20; i++) {
				try {
					process.kill(electronPid, 0);
					await new Promise(resolve => setTimeout(resolve, 100));
				} catch {
					break;
				}
			}
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
 * Emits an IPC message from the main process to all renderer windows.
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @param {string} channel
 * @param {any} args
 */
export async function emitIpcToRenderer(electronApp, channel, ...args) {
	return electronApp.evaluate(({ webContents }, { channel, args }) => {
		webContents.getAllWebContents().forEach(wc => {
			wc.send(channel, ...args);
		});
	}, { channel, args });
}

/**
 * Gets the current URL of the main application window.
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @returns {Promise<string>}
 */
export async function getAppWindowUrl(electronApp) {
	for (let i = 0; i < 20; i++) {
		const url = await electronApp.evaluate(({ BrowserWindow }) => {
			const window = BrowserWindow.getAllWindows()[0];
			if (window?.contentView?.children?.length > 0) {
				return window.contentView.children[0].webContents.getURL();
			}
			return null;
		});
		if (url && url !== `about:blank` && !url.startsWith(`data:text/html`)) return url;
		await new Promise(resolve => setTimeout(resolve, 250));
	}
	return ``;
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
			const window = windows[0];
			if (window.contentView && window.contentView.children && window.contentView.children.length > 1) {
				// children[1] is $eyasLayer (the UI)
				return window.contentView.children[1].webContents.executeJavaScript(script);
			}
		}
	}, script);
}

/**
 * Gets the current height of the UI layer (the second WebContentsView).
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @returns {Promise<number>}
 */
export async function getUiLayerHeight(electronApp) {
	for (let i = 0; i < 20; i++) {
		const height = await electronApp.evaluate(({ BrowserWindow }) => {
			const window = BrowserWindow.getAllWindows()[0];
			if (window?.contentView?.children?.length > 1) {
				return window.contentView.children[1].getBounds().height;
			}
			return null;
		});
		if (height !== null && height > 0) return height;
		await new Promise(resolve => setTimeout(resolve, 250));
	}
	return 0;
}

/**
 * Gets the current bounds of the test layer (the first WebContentsView).
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @returns {Promise<{x: number, y: number, width: number, height: number}>}
 */
export async function getTestLayerBounds(electronApp) {
	for (let i = 0; i < 20; i++) {
		const bounds = await electronApp.evaluate(({ BrowserWindow }) => {
			const window = BrowserWindow.getAllWindows()[0];
			if (window?.contentView?.children?.length > 0) {
				const b = window.contentView.children[0].getBounds();
				return { x: b.x, y: b.y, width: b.width, height: b.height };
			}
			return null;
		});
		if (bounds && bounds.width > 0) return bounds;
		await new Promise(resolve => setTimeout(resolve, 250));
	}
	return { x: 0, y: 0, width: 0, height: 0 };
}

/**
 * Gets the content size of the main application window.
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @returns {Promise<[number, number]>}
 */
export async function getAppWindowContentSize(electronApp) {
	return electronApp.evaluate(({ BrowserWindow }) => {
		const windows = BrowserWindow.getAllWindows();
		if (windows.length > 0) {
			return windows[0].getContentSize();
		}
		return [0, 0];
	});
}
