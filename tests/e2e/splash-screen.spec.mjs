import { _electron as electron, test, expect } from '@playwright/test';
import * as path from 'path';
import fs from 'fs-extra';
import { exitEyas, electronPath } from './eyas-utils.mjs';

test(`Splash screen file should exist in the build output`, async () => {
	const splashPath = path.join(import.meta.dirname, `../../out/eyas-interface/splash.html`);
	const exists = await fs.pathExists(splashPath);
	expect(exists).toBe(true);
});

test(`App should load the splash screen via the ui:// protocol`, async () => {
	const mainPath = path.join(import.meta.dirname, `../../out/main/index.js`);

	// Standard project isolation: Use a unique temporary directory for each test
	const userDataDir = path.join(import.meta.dirname, `../../.test-data`, `user-data-splash-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
	await fs.ensureDir(userDataDir);

	const electronApp = await electron.launch({
		executablePath: electronPath,
		args: [
			mainPath,
			`--dev`,
			`--user-data-dir=${userDataDir}`
		]
	});

	// In Eyas, the splash screen is created early and destroyed once the UI loads.
	// We poll immediately to catch it before it disappears.
	let hasSplash = false;
	for (let i = 0; i < 50; i++) {
		const urls = await Promise.all(electronApp.windows().map(w => w.url()));
		hasSplash = urls.some(u => u.includes(`splash.html`));
		if (hasSplash) { break; }
		await new Promise(resolve => setTimeout(resolve, 100));
	}

	await exitEyas(electronApp);
	expect(hasSplash).toBe(true);
});
