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
