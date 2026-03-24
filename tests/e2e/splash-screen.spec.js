const { _electron: electron, test, expect } = require(`@playwright/test`);
const path = require(`path`);
const fs = require(`fs-extra`);

test(`Splash screen file should exist in the build output`, async () => {
	const splashPath = path.join(__dirname, `../../out/eyas-interface/splash.html`);
	const exists = await fs.pathExists(splashPath);
	expect(exists).toBe(true);
});

test(`App should load the splash screen via the ui:// protocol`, async () => {
	const electronPath = require(`electron`);
	const mainPath = path.join(__dirname, `../../out/main/index.js`);

	const electronApp = await electron.launch({
		executablePath: electronPath,
		args: [mainPath, `--dev`]
	});

	await electronApp.firstWindow();
	// In Eyas, the splash screen is usually the first window or a transition window
	// We can check if any window has the splash URL
	const urls = await Promise.all(electronApp.windows().map(w => w.url()));
	const hasSplash = urls.some(u => u.includes(`splash.html`));

	await electronApp.close();
	expect(hasSplash).toBe(true);
});
