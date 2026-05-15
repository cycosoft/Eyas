import { test, expect } from '@playwright/test';
import { launchEyas, exitEyas, getUiView } from './eyas-utils.mjs';

test(`app launches and displays UI`, async () => {
	const electronApp = await launchEyas();

	// Verify the Electron app is running
	const process = electronApp.process();
	expect(process).not.toBeNull();
	expect(process.pid).toBeGreaterThan(0);

	// Verify the UI view is ready
	const uiPage = await getUiView(electronApp);
	expect(uiPage).not.toBeNull();
	await expect(uiPage).toHaveURL(/index\.html|localhost/);

	await exitEyas(electronApp);
});

test(`app launches with eyas:// URL in argv (start-up request path)`, async () => {
	const electronApp = await launchEyas([`eyas://example.com/test`]);

	expect(electronApp.process()).not.toBeNull();
	expect(electronApp.process().pid).toBeGreaterThan(0);

	// Verify the UI view is ready
	const uiPage = await getUiView(electronApp);
	expect(uiPage).not.toBeNull();

	await exitEyas(electronApp);
});
