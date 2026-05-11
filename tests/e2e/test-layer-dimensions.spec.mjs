import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getTestLayerBounds,
	EYAS_HEADER_HEIGHT
} from './eyas-utils.mjs';

test.describe(`Test Layer Dimensions`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`initial dimensions should be correct on launch`, async () => {
		// Wait for the layers to synchronize with the window size
		let testLayerBounds;

		await expect.poll(async () => {
			testLayerBounds = await getTestLayerBounds(electronApp);
			return testLayerBounds.width;
		}, { timeout: 10000 }).toBeGreaterThan(0);

		// Polling wait for dimensions to match the initial default viewport (1024x768)
		await expect.poll(async () => {
			testLayerBounds = await getTestLayerBounds(electronApp);

			return (
				testLayerBounds.width === 1024 &&
				testLayerBounds.height === 768 &&
				testLayerBounds.y === EYAS_HEADER_HEIGHT
			);
		}, {
			message: `Test layer dimensions did not synchronize with the default 1024x768 viewport`,
			timeout: 10000
		}).toBe(true);
	});
});
