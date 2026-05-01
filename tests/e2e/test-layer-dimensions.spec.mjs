import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getTestLayerBounds,
	getAppWindowContentSize
} from './eyas-utils.mjs';

const EYAS_HEADER_HEIGHT = 48;

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
		let windowWidth, windowHeight, testLayerBounds;

		await expect.poll(async () => {
			[windowWidth, windowHeight] = await getAppWindowContentSize(electronApp);
			testLayerBounds = await getTestLayerBounds(electronApp);
			return testLayerBounds.width;
		}, { timeout: 10000 }).toBeGreaterThan(0);

		// Polling wait for dimensions to match
		await expect.poll(async () => {
			[windowWidth, windowHeight] = await getAppWindowContentSize(electronApp);
			testLayerBounds = await getTestLayerBounds(electronApp);
			const expectedHeight = windowHeight - EYAS_HEADER_HEIGHT;

			return (
				testLayerBounds.width === windowWidth &&
				testLayerBounds.height === expectedHeight &&
				testLayerBounds.y === EYAS_HEADER_HEIGHT
			);
		}, {
			message: `Test layer dimensions did not synchronize with window dimensions`,
			timeout: 10000
		}).toBe(true);
	});
});
