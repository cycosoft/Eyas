const { test, expect } = require(`@playwright/test`);
const { launchEyas, exitEyas } = require(`./eyas-utils`);

test(`app launches and displays UI`, async () => {
	const electronApp = await launchEyas();

	// Verify the Electron app is running
	const process = electronApp.process();
	expect(process).not.toBeNull();
	expect(process.pid).toBeGreaterThan(0);

	// Verify we have a window
	const window = await electronApp.firstWindow();
	expect(window).not.toBeNull();

	// Wait a bit for the app to fully initialize
	await new Promise(resolve => setTimeout(resolve, 1000));

	await exitEyas(electronApp);
});

test(`app launches with eyas:// URL in argv (start-up request path)`, async () => {
	const electronApp = await launchEyas([`eyas://example.com/test`]);

	expect(electronApp.process()).not.toBeNull();
	expect(electronApp.process().pid).toBeGreaterThan(0);

	const window = await electronApp.firstWindow();
	expect(window).not.toBeNull();

	await new Promise(resolve => setTimeout(resolve, 1000));

	await exitEyas(electronApp);
});
