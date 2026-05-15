import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	emitIpcToRenderer,
	getUiView
} from './eyas-utils.mjs';

test.describe(`Update Status Visuals`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`displays correct icons and colors for each update state`, async () => {
		const uiPage = await getUiView(electronApp);
		const btn = uiPage.locator(`[data-qa="btn-broadcast"]`);
		const icon = btn.locator(`i.v-icon`);

		// Wait for the initial background update check to settle
		await expect(icon).toHaveClass(/mdi-progress-check/, { timeout: 10000 });
		// Give it a tiny moment to ensure no more pending IPCs are in flight
		await uiPage.waitForTimeout(1000);

		// Helper to check state
		const checkState = async (status, iconClass, colorClass, animationClass = null) => {
			await emitIpcToRenderer(electronApp, `update-status-updated`, status);

			// Wait for the icon to change
			const iconRegex = new RegExp(iconClass);
			await expect(icon).toHaveClass(iconRegex, { timeout: 10000 });

			if (colorClass) {
				const colorRegex = new RegExp(colorClass);
				await expect(btn).toHaveClass(colorRegex, { timeout: 10000 });
			}
			if (animationClass) {
				const animRegex = new RegExp(animationClass);
				await expect(btn).toHaveClass(animRegex, { timeout: 10000 });
			} else {
				await expect(btn).not.toHaveClass(/blink-animation/, { timeout: 10000 });
			}
		};

		// 1. Idle (Default)
		// Icon should be mdi-progress-check
		await emitIpcToRenderer(electronApp, `update-status-updated`, `idle`);
		await expect(icon).toHaveClass(/mdi-progress-check/);

		// 2. Checking
		// Icon: mdi-progress-clock, Color: text-primary (vuetify), Animation: blink-animation
		await checkState(`checking`, `mdi-progress-clock`, `text-primary`, `blink-animation`);

		// 3. Downloading
		// Icon: mdi-progress-download, Color: text-primary, Animation: blink-animation
		await checkState(`downloading`, `mdi-progress-download`, `text-primary`, `blink-animation`);

		// 4. Downloaded
		// Icon: mdi-progress-alert, Color: text-success
		await checkState(`downloaded`, `mdi-progress-alert`, `text-success`);

		// 5. Error
		// Icon: mdi-progress-close, Color: text-error
		await checkState(`error`, `mdi-progress-close`, `text-error`);
	});
});
