import type { WebContents } from 'electron';
import type { CoreContext } from '@registry/eyas-core.js';
import { isMac } from '@scripts/platform-utils.js';

const ZOOM_FACTORS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0];

/**
 * Adjusts the zoom level of the test layer content.
 */
function adjustZoom(ctx: CoreContext, direction: `in` | `out` | `reset`): void {
	const testWebContents = ctx.$testLayer?.webContents;
	if (!testWebContents || testWebContents.isDestroyed()) { return; }

	if (direction === `reset`) {
		testWebContents.setZoomFactor(1.0);
		ctx.updateNavigationState();
		return;
	}

	const currentFactor = testWebContents.getZoomFactor();

	// Find the closest zoom factor in the array to avoid floating-point errors
	let closestIndex = 0;
	let minDiff = Math.abs(ZOOM_FACTORS[0] - currentFactor);
	for (let i = 1; i < ZOOM_FACTORS.length; i++) {
		const diff = Math.abs(ZOOM_FACTORS[i] - currentFactor);
		if (diff < minDiff) {
			minDiff = diff;
			closestIndex = i;
		}
	}

	if (direction === `in`) {
		const nextIndex = Math.min(closestIndex + 1, ZOOM_FACTORS.length - 1);
		testWebContents.setZoomFactor(ZOOM_FACTORS[nextIndex]);
	} else if (direction === `out`) {
		const nextIndex = Math.max(closestIndex - 1, 0);
		testWebContents.setZoomFactor(ZOOM_FACTORS[nextIndex]);
	}

	ctx.updateNavigationState();
}

/**
 * Registers keyboard shortcuts for a specific WebContents.
 * @param ctx The core context.
 * @param webContents The WebContents to register shortcuts for.
 */
export function registerShortcutListeners(ctx: CoreContext, webContents: WebContents): void {
	webContents.on(`before-input-event`, (event, input) => {
		if (input.type !== `keyDown`) { return; }

		if (input.key === `F12`) {
			const testWebContents = ctx.$testLayer?.webContents || ctx.$appWindow?.webContents;
			if (testWebContents && !testWebContents.isDestroyed()) {
				event.preventDefault();
				testWebContents.toggleDevTools();
			}
			return;
		}

		// Zoom shortcuts (Ctrl on Win/Linux, Cmd on Mac)
		const isModifierActive = isMac ? input.meta : input.control;
		if (isModifierActive) {
			if (input.key === `+` || input.key === `=`) {
				event.preventDefault();
				adjustZoom(ctx, `in`);
			} else if (input.key === `-`) {
				event.preventDefault();
				adjustZoom(ctx, `out`);
			} else if (input.key === `0`) {
				event.preventDefault();
				adjustZoom(ctx, `reset`);
			}
		}
	});
}

