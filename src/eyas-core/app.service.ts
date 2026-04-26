import { app, dialog, nativeTheme } from 'electron';
import _path from 'node:path';
import fs from 'node:fs';
import { format } from 'date-fns/format';
import { isPast } from 'date-fns/isPast';
import { differenceInDays } from 'date-fns/differenceInDays';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import type { CoreContext, AppService } from '@registry/eyas-core.js';
import type { FormattedDuration, FilePath, TimeString, DomainUrl, MPEventName, LoadMethod, ThemeSource, MetadataRecord } from '@registry/primitives.js';
import type { PreventableEvent, ConfigToLoad } from '@registry/core.js';
import type { DeepLinkContext } from '@registry/deep-link.js';
import { MP_EVENTS } from './metrics-events.js';
import { analyticsService } from './analytics.service.js';
import * as settingsService from './settings-service.js';
import { LOAD_TYPES } from '@scripts/constants.js';

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
				icon: ctx.$paths.icon as FilePath,
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

		let output: Date | TimeString = new Date();

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
	 * Requests the application to exit gracefully.
	 */
	requestExit(): void {
		app.quit();
	},

	/**
	 * Handles the test server session timeout.
	 * @param ctx The core context.
	 */
	onTestServerTimeout(ctx: CoreContext): void {
		ctx.uiEvent(`test-server-timeout`);
		ctx.stopTestServer();
	},
	/**
	 * Tracks an event with Mixpanel.
	 * @param ctx The core context.
	 * @param event The event name.
	 * @param extraData Additional data to include.
	 */
	async trackEvent(ctx: CoreContext, event: MPEventName, extraData: MetadataRecord = {}): Promise<void> {
		await analyticsService.init(ctx.$isDev);
		await analyticsService.trackEvent(event, ctx.$config, ctx._appVersion, extraData);
	},

	/**
	 * Forces an exit if the loaded test has expired.
	 * @param ctx The core context.
	 */
	checkExpiration(ctx: CoreContext): void {
		if (!ctx.$config) { return; }

		const expirationDate = new Date(ctx.$config.meta.expires);
		if (!isPast(expirationDate)) { return; }

		dialog.showMessageBoxSync({
			title: `🚫 Test Expired`,
			message: `This test expired on ${format(expirationDate, `PPP`)} and can no longer be used`,
			buttons: [`Exit`],
			noLink: true
		});

		this.trackEvent(ctx, MP_EVENTS.core.exit);
		app.quit();
	},

	/**
	 * Sets up the default protocol client for the application.
	 * @param ctx The core context.
	 */
	setupProtocols(_ctx: CoreContext): void {
		if (process.defaultApp) {
			if (process.argv.length >= 2) {
				app.setAsDefaultProtocolClient(
					`eyas`,
					process.execPath,
					[_path.resolve(process.argv[1])]
				);
			} else {
				app.setAsDefaultProtocolClient(`eyas`);
			}
		} else {
			app.setAsDefaultProtocolClient(`eyas`);
		}
	},

	/**
	 * Initializes the application core.
	 * @param ctx The core context.
	 */
	async init(ctx: CoreContext): Promise<void> {
		const {
			handleEyasProtocolUrl,
			getEyasUrlFromCommandLine
		} = await import(`./deep-link-handler.js`);

		this.setupProtocols(ctx);

		const deepLinkContext: DeepLinkContext = {
			getAppWindow: () => ctx.$appWindow,
			setConfigToLoad: (p: ConfigToLoad) => ctx.setConfigToLoad(p),
			loadConfig: async (method: LoadMethod, path: FilePath) => {
				const getConfig = (await import(`../scripts/get-config.js`)).default;
				ctx.setConfig(await getConfig(method, path));
			},
			startAFreshTest: () => ctx.startAFreshTest(),
			LOAD_TYPES
		};

		// macOS: detect if the app was opened with a file
		app.on(`open-file`, async (_event, path) => {
			if (!path.endsWith(`.eyas`)) { return; }

			if (ctx.$appWindow) {
				const getConfig = (await import(`../scripts/get-config.js`)).default;
				ctx.setConfig(await getConfig(LOAD_TYPES.ASSOCIATION, path));
				ctx.startAFreshTest();
			} else {
				ctx.setConfigToLoad({ method: LOAD_TYPES.ASSOCIATION, path });
			}
		});

		// macOS: handle eyas:// protocol (open-url)
		app.on(`open-url`, (_event, url) => {
			_event.preventDefault();
			handleEyasProtocolUrl(url as DomainUrl, deepLinkContext);
		});

		// Windows/Linux: handle second instance with protocol URL
		app.on(`second-instance`, (_event, commandLine) => {
			if (ctx.$appWindow) {
				if (ctx.$appWindow.isMinimized()) { ctx.$appWindow.restore(); }
				ctx.$appWindow.focus();
			}
			const url = getEyasUrlFromCommandLine(commandLine);
			if (url) {
				handleEyasProtocolUrl(url, deepLinkContext);
			}
		});
	},

	/**
	 * Handles the application ready event.
	 * @param ctx The core context.
	 */
	async handleReady(ctx: CoreContext): Promise<void> {
		const getConfig = (await import(`../scripts/get-config.js`)).default;
		ctx.setConfig(await getConfig(ctx.$configToLoad.method || LOAD_TYPES.AUTO, ctx.$configToLoad.path));

		await settingsService.load();

		const themeSource = settingsService.get(`theme`) as ThemeSource;
		nativeTheme.themeSource = (themeSource as `light` | `dark` | `system`) || `system`;

		// setup network handlers
		const { setupEyasNetworkHandlers } = await import(`./protocol-handlers.js`);
		setupEyasNetworkHandlers(ctx);

		// start the UI
		// index.ts will call initElectronUi which uses WindowService
		// For now, let's keep the orchestration in index.ts for the high level
	}
};
