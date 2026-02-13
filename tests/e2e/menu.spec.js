const { _electron: electron } = require(`@playwright/test`);
const path = require(`path`);
const { test, expect } = require(`@playwright/test`);

/**
 * Serialize the application menu to a plain structure (labels only) for assertion.
 * Runs in the Electron main process via evaluate().
 */
function getMenuStructure(electronApp) {
	return electronApp.evaluate(({ Menu }) => {
		const appMenu = Menu.getApplicationMenu();
		if (!appMenu) return null;
		function toPlain(menu) {
			return menu.items.map(item => ({
				label: item.label || ``,
				submenu: item.submenu ? toPlain(item.submenu) : undefined
			}));
		}
		return toPlain(appMenu);
	});
}

/**
 * Programmatically click a top-level menu item.
 * Runs in the Electron main process via evaluate().
 */
function clickTopLevelMenuItem(electronApp, label) {
	return electronApp.evaluate(({ Menu }, label) => {
		const appMenu = Menu.getApplicationMenu();
		if (!appMenu) return false;

		const menuItem = appMenu.items.find(item => item.label && item.label.includes(label));
		if (menuItem && menuItem.click) {
			// In a test environment, passing a direct window reference can be tricky.
			// The handler for this specific click doesn't use the window object, so null is safe.
			menuItem.click(menuItem, null, {});
			return true;
		}
		return false;
	}, label);
}

function getTopLevelLabels(menuStructure) {
	return menuStructure ? menuStructure.map(item => item.label) : [];
}

function findSubmenuLabels(menuStructure, topLevelLabelContains) {
	if (!menuStructure) return [];
	const top = menuStructure.find(item => item.label && item.label.includes(topLevelLabelContains));
	return top?.submenu ? top.submenu.map(item => item.label).filter(Boolean) : [];
}

test(`application menu has expected top-level items`, async () => {
	const electronPath = require(`electron`);
	const mainPath = path.join(__dirname, `../../.build/index.js`);

	const electronApp = await electron.launch({
		executablePath: electronPath,
		args: [mainPath, `--dev`],
		timeout: 30000
	});

	const window = await electronApp.firstWindow();
	await window.waitForLoadState(`domcontentloaded`);
	await new Promise(resolve => setTimeout(resolve, 1500));

	const menuStructure = await getMenuStructure(electronApp);
	expect(menuStructure).not.toBeNull();
	expect(Array.isArray(menuStructure)).toBe(true);

	const topLevel = getTopLevelLabels(menuStructure);
	expect(topLevel.length).toBeGreaterThanOrEqual(5);

	expect(topLevel[0]).toMatch(/Eyas/i);
	expect(topLevel.some(l => l.includes(`Tools`))).toBe(true);
	expect(topLevel.some(l => l.includes(`Network`))).toBe(true);
	expect(topLevel.some(l => l.includes(`Cache`))).toBe(true);
	expect(topLevel.some(l => l.includes(`Viewport`))).toBe(true);

	try {
		const result = await electronApp.evaluate(({ BrowserWindow }) => {
			const windows = BrowserWindow.getAllWindows();
			if (windows.length > 0 && windows[0].getBrowserViews().length > 0) {
				return windows[0].getBrowserViews()[0].webContents.executeJavaScript(`
					window.eyas && window.eyas.send ? (window.eyas.send('app-exit'), true) : false;
				`);
			}
			return false;
		});
		if (result) await new Promise(resolve => setTimeout(resolve, 500));
	} catch {
		// ignore
	}
	await electronApp.close();
});

test(`app-name menu has About and Exit`, async () => {
	const electronPath = require(`electron`);
	const mainPath = path.join(__dirname, `../../.build/index.js`);

	const electronApp = await electron.launch({
		executablePath: electronPath,
		args: [mainPath, `--dev`],
		timeout: 30000
	});

	const window = await electronApp.firstWindow();
	await window.waitForLoadState(`domcontentloaded`);
	await new Promise(resolve => setTimeout(resolve, 1500));

	const menuStructure = await getMenuStructure(electronApp);
	expect(menuStructure).not.toBeNull();

	const appSubmenu = findSubmenuLabels(menuStructure, `Eyas`);
	expect(appSubmenu.some(l => l.includes(`About`))).toBe(true);
	expect(appSubmenu.some(l => l.includes(`Exit`))).toBe(true);

	try {
		await electronApp.evaluate(({ BrowserWindow }) => {
			const w = BrowserWindow.getAllWindows()[0];
			if (w && w.getBrowserViews().length > 0) {
				return w.getBrowserViews()[0].webContents.executeJavaScript(`window.eyas?.send('app-exit'); true`);
			}
			return false;
		});
		await new Promise(resolve => setTimeout(resolve, 500));
	} catch {
		// ignore
	}
	await electronApp.close();
});

test.fixme(`Expose Test menu flow works correctly`, async () => {
	const electronPath = require(`electron`);
	const mainPath = path.join(__dirname, `../../.build/index.js`);

	const electronApp = await electron.launch({
		executablePath: electronPath,
		args: [mainPath, `--dev`],
		timeout: 30000
	});

	const window = await electronApp.firstWindow();
	await window.waitForLoadState(`domcontentloaded`);

	// The UI is in a BrowserView, find its Page object by looking for the custom protocol
	const ui = electronApp.windows().find(p => p.url().startsWith(`ui://`));
	expect(ui).toBeDefined();

	await new Promise(resolve => setTimeout(resolve, 1500));

	// --- 0. Clear initial Environment Modal if present ---
	const envModalTitle = ui.locator(`[data-qa="environment-modal-title"]`);
	if (await envModalTitle.isVisible()) {
		await ui.locator(`[data-qa="btn-env"]`).first().click().catch(() => {});
		await new Promise(resolve => setTimeout(resolve, 500));
	}

	// --- 1. Click menu item, modal appears ---
	await clickTopLevelMenuItem(electronApp, `Expose Test`);
	const modalTitle = ui.locator(`[data-qa="expose-setup-title"]`);
	await expect(modalTitle).toBeVisible();

	// --- 2. Click cancel, modal disappears, server not started ---
	await ui.locator(`[data-qa="btn-cancel-expose"]`).click();
	await expect(modalTitle).not.toBeVisible();
	let menu = await getMenuStructure(electronApp);
	let exposeItem = menu.find(item => item.label.includes(`Expose`));
	expect(exposeItem.label).toContain(`Expose Test`); // Should not have changed

	// --- 3. Click continue, server starts ---
	await clickTopLevelMenuItem(electronApp, `Expose Test`);
	await ui.locator(`[data-qa="btn-continue-expose"]`).click();
	await expect(modalTitle).not.toBeVisible();

	// Wait for menu to update
	await new Promise(resolve => setTimeout(resolve, 1000));

	menu = await getMenuStructure(electronApp);
	exposeItem = menu.find(item => item.label.includes(`Expose`));
	expect(exposeItem.label).toMatch(/Exposed for ~30m/); // Should now show remaining time

	// --- Cleanup ---
	try {
		// Attempt clean exit via IPC
		await electronApp.evaluate(({ BrowserWindow }) => {
			const w = BrowserWindow.getAllWindows()[0];
			if (w && w.getBrowserViews().length > 0) {
				return w.getBrowserViews()[0].webContents.executeJavaScript(`window.eyas?.send('app-exit'); true`);
			}
			return false;
		});
		await new Promise(resolve => setTimeout(resolve, 1000));
	} catch {
		// fallback to clicking the exit button if modal is visible
		const exitButton = ui.locator(`[data-qa="btn-exit"]`);
		if (await exitButton.isVisible()) {
			await exitButton.click();
		}
	}
	await electronApp.close();
});

