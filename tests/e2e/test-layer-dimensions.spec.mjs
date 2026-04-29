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
		const [windowWidth, windowHeight] = await getAppWindowContentSize(electronApp);
		const testLayerBounds = await getTestLayerBounds(electronApp);

		console.log(`Window Content Size: ${windowWidth}x${windowHeight}`);
		console.log(`Test Layer Bounds: ${testLayerBounds.width}x${testLayerBounds.height} at (${testLayerBounds.x}, ${testLayerBounds.y})`);

		// Expected height is window height minus the header
		const expectedHeight = windowHeight - EYAS_HEADER_HEIGHT;

		expect(testLayerBounds.width).toBe(windowWidth);
		expect(testLayerBounds.height).toBe(expectedHeight);
		expect(testLayerBounds.y).toBe(EYAS_HEADER_HEIGHT);
	});
});
