import type { WebContents } from 'electron';
import type { CoreContext } from '@registry/eyas-core.js';

/**
 * Registers keyboard shortcuts for a specific WebContents.
 * @param ctx The core context.
 * @param webContents The WebContents to register shortcuts for.
 */
export function registerShortcutListeners(ctx: CoreContext, webContents: WebContents): void {
	webContents.on(`before-input-event`, (event, input) => {
		if (input.type === `keyDown` && input.key === `F12`) {
			const testWebContents = ctx.$testLayer?.webContents || ctx.$appWindow?.webContents;
			if (testWebContents && !testWebContents.isDestroyed()) {
				event.preventDefault();
				testWebContents.toggleDevTools();
			}
		}
	});
}
