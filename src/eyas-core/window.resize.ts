import { EYAS_HEADER_HEIGHT } from '@scripts/constants.js';
import type { CoreContext } from '@registry/eyas-core.js';

/**
 * Handles window resize events.
 * @param ctx The core context.
 */
export function handleResize(ctx: CoreContext): void {
	const { $appWindow, $eyasLayer, $testLayer, $currentViewport } = ctx;
	if (!$appWindow || $appWindow.isDestroyed()) { return; }

	const [newWidth, newHeight] = $appWindow.getContentSize();
	const newViewportHeight = newHeight - EYAS_HEADER_HEIGHT;

	// Only update $currentViewport on genuine manual resizes.
	// HiDPI displays round setContentSize() by ~2px — a synthetic resize that
	// must not override the exact viewport the user selected.
	const isDpiRounding =
		Math.abs(newWidth - $currentViewport[0]) <= 5 &&
		Math.abs(newViewportHeight - $currentViewport[1]) <= 5;

	if (!isDpiRounding) {
		$currentViewport[0] = newWidth;
		$currentViewport[1] = newViewportHeight;
	}

	// Resize the UI layer to match the actual window (always uses real window size)
	if ($eyasLayer && !$eyasLayer.webContents.isDestroyed()) {
		const currentLayerHeight = $eyasLayer.getBounds().height;
		const isActive = currentLayerHeight > EYAS_HEADER_HEIGHT;
		const newLayerHeight = isActive ? newHeight : EYAS_HEADER_HEIGHT;
		$eyasLayer.setBounds({ x: 0, y: 0, width: newWidth, height: newLayerHeight });
	}

	// Resize the test layer to the canonical $currentViewport (exact, not DPI-rounded)
	if ($testLayer && !$testLayer.webContents.isDestroyed()) {
		$testLayer.setBounds({
			x: 0,
			y: EYAS_HEADER_HEIGHT,
			width: $currentViewport[0],
			height: $currentViewport[1]
		});
	}

	ctx.setMenu();
	ctx.updateNavigationState();
}
