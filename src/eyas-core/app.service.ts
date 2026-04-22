import { dialog } from 'electron';
import _path from 'node:path';
import fs from 'node:fs';
import { format } from 'date-fns/format';
import { differenceInDays } from 'date-fns/differenceInDays';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import type { CoreContext, AppService } from '@registry/eyas-core.js';
import type { FormattedDuration } from '@registry/primitives.js';
import type { PreventableEvent } from '@registry/core.js';
import { MP_EVENTS } from './metrics-events.js';
import { testServerService } from './test-server.service.js';

/**
 * Service for managing the application lifecycle and core interactions.
 */
export const appService: AppService = {
	/**
	 * Displays the application About dialog with configuration and environment details.
	 * @param ctx The core context.
	 */
	showAbout(ctx: CoreContext): void {
		if (!ctx.$config) { return; }

		const now = new Date();
		const expires = new Date(ctx.$config.meta.expires);
		const dayCount = differenceInDays(expires, now);
		const expirationFormatted = format(expires, `MMM do @ p`);
		const relativeFormatted = dayCount ? `~${dayCount} days` : `soon`;
		const startYear = 2023;
		const currentYear = now.getFullYear();
		const yearRange = startYear === currentYear ? startYear.toString() : `${startYear} - ${currentYear}`;

		if (ctx.$appWindow) {
			dialog.showMessageBox(ctx.$appWindow, {
				type: `info`,
				buttons: [`OK`],
				title: `About`,
				icon: ctx.$paths.icon as string,
				message: `
Name: ${ctx.$config.title}
Version: ${ctx.$config.version}
Expires: ${expirationFormatted} (${relativeFormatted})

Branch: ${ctx.$config.meta.gitBranch} #${ctx.$config.meta.gitHash}
User: ${ctx.$config.meta.gitUser}
Created: ${new Date(ctx.$config.meta.compiled).toLocaleString()}
CLI: v${ctx.$config.meta.eyas}

Runner: v${ctx._appVersion}

🏢 © ${yearRange} Cycosoft, LLC
🌐 https://cycosoft.com
🆘 https://github.com/cycosoft/Eyas/issues
`
			});
		}
	},

	/**
	 * Clears the application cache and storage data.
	 * @param ctx The core context.
	 */
	clearCache(ctx: CoreContext): void {
		if (!ctx.$appWindow) { return; }

		// clear all caches for the session
		ctx.$appWindow.webContents.session.clearCache();
		ctx.$appWindow.webContents.session.clearStorageData();

		// update the menu to reflect the cache changes
		ctx.setMenu();
	},

	/**
	 * Calculates the relative time since the application session started.
	 * @param ctx The core context.
	 * @returns A formatted duration string.
	 */
	getSessionAge(ctx: CoreContext): FormattedDuration {
		if (!ctx.$appWindow) { return ``; }

		let output: Date | string = new Date();

		// get the path to the cache
		const cachePath = ctx.$appWindow.webContents.session.getStoragePath();

		// if the cache path was found
		if (cachePath) {
			// create a path to the `Session Storage` folder
			const sessionFolder = _path.join(cachePath, `Session Storage`);

			// if the session folder exists
			if (fs.existsSync(sessionFolder)) {
				// get the date the folder was created
				output = fs.statSync(sessionFolder).birthtime;
			}
		}

		// format the output to a relative time
		output = formatDistanceToNow(output as Date);

		return output;
	},

	/**
	 * Handles the application close event by displaying an exit confirmation modal.
	 * @param ctx The core context.
	 * @param evt The preventable event (e.g., from Electron window 'close' event).
	 */
	manageAppClose(ctx: CoreContext, evt: PreventableEvent): void {
		// stop the window from closing
		evt.preventDefault();

		// send a message to the UI to show the exit modal
		ctx.uiEvent(`modal-exit-visible`, true);

		// track that the modal background content was viewed
		ctx.trackEvent(MP_EVENTS.ui.modalBackgroundContentViewed);
	},

	/**
	 * Handles the test server session timeout.
	 * @param ctx The core context.
	 */
	onTestServerTimeout(ctx: CoreContext): void {
		testServerService.onTimeout(ctx);
	}
};
