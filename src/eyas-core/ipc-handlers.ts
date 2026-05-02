import { ipcMain, nativeTheme, app, shell } from 'electron';
import type { CoreContext } from '@registry/eyas-core.js';
import { parseURL } from '@scripts/parse-url.js';
import * as settingsService from './settings-service.js';
import * as testServer from './test-server/test-server.js';
import * as testServerTimeout from './test-server/test-server-timeout.js';
import { TEST_SERVER_SESSION_DURATION_MS, EYAS_HEADER_HEIGHT } from '@scripts/constants.js';
import { MP_EVENTS } from './metrics-events.js';

import type {
	LaunchLinkPayload,
	EnvironmentSelectedPayload,
	SaveSettingPayload,
	TestServerSetupPayload
} from '@registry/ipc.js';
import type { IsActive, AppVersion, ViewportWidth, ViewportHeight } from '@registry/primitives.js';

/**
 * Initializes all IPC handlers for the application.
 * @param ctx The core context providing access to global state and orchestrator functions.
 */
export function initIpcHandlers(ctx: CoreContext): void {
	initAppIpcListeners(ctx);
	initEnvironmentIpcListeners(ctx);
	initSettingsIpcListeners(ctx);
	initTestServerIpcListeners(ctx);

	// once the "What's New" modal is closed, trigger the next modal in the sequence
	ipcMain.on(`whats-new-closed`, () => {
		ctx.triggerBufferedModal();
	});
}

/**
 * Initializes application-level IPC listeners.
 * @param ctx The core context.
 */
function initAppIpcListeners(ctx: CoreContext): void {
	initCoreIpcListeners(ctx);
	initBrowserIpcListeners(ctx);
	initDevToolsIpcListeners(ctx);
	initViewportIpcListeners(ctx);
	initCacheIpcListeners(ctx);
}

/**
 * Initializes core application IPC listeners.
 * @param ctx The core context.
 */
function initCoreIpcListeners(ctx: CoreContext): void {
	ipcMain.on(`show-ui`, () => { ctx.toggleEyasUI(true); });
	ipcMain.on(`hide-ui`, () => { ctx.toggleEyasUI(false, true); });
	ipcMain.on(`request-exit`, () => { ctx.requestExit(); });

	ipcMain.on(`app-exit`, () => {
		if (!ctx.$appWindow) { return; }
		ctx.$appWindow.removeListener(`close`, ctx.manageAppClose);
		ctx.trackEvent(MP_EVENTS.core.exit);
		ctx.stopTestServer();
		app.quit();
	});

	ipcMain.on(`renderer-ready-for-modals`, (_event, latestChangelogVersion: AppVersion) => {
		ctx.setLatestChangelogVersion(latestChangelogVersion);
		if (!ctx.$isStartupSequenceChecked) {
			ctx.setIsStartupSequenceChecked(true);
			ctx.checkStartupSequence();
		}
	});

	ipcMain.on(`launch-link`, (_event, { url, openInBrowser }: LaunchLinkPayload) => {
		const parsed = parseURL(url);
		ctx.navigate(parsed ? parsed.toString() : url, openInBrowser, !openInBrowser);
	});

	ipcMain.on(`show-about`, () => { ctx.showAbout(); });
	ipcMain.on(`show-settings`, () => { ctx.onOpenSettings(); });
	ipcMain.on(`show-whats-new`, () => { ctx.uiEvent(`show-whats-new`, true); });
	ipcMain.on(`show-test-server-setup`, () => { ctx.showTestServerSetup(); });
}

/**
 * Initializes browser control IPC listeners.
 * @param ctx The core context.
 */
function initBrowserIpcListeners(ctx: CoreContext): void {
	ipcMain.on(`browser-back`, () => ctx.goBack());
	ipcMain.on(`browser-forward`, () => ctx.goForward());
	ipcMain.on(`browser-reload`, () => ctx.reload());
	ipcMain.on(`browser-home`, () => ctx.navigate());
}

/**
 * Initializes devtools IPC listeners.
 * @param ctx The core context.
 */
function initDevToolsIpcListeners(ctx: CoreContext): void {
	ipcMain.on(`open-devtools-ui`, () => {
		if (ctx.$eyasLayer && !ctx.$eyasLayer.webContents.isDestroyed()) {
			ctx.$eyasLayer.webContents.openDevTools({ mode: `detach` });
		}
	});

	ipcMain.on(`open-devtools-test`, () => {
		const webContents = (ctx.$testLayer || ctx.$appWindow)?.webContents;
		if (webContents && !webContents.isDestroyed()) {
			webContents.toggleDevTools();
		}
	});
}

/**
 * Initializes viewport management IPC listeners.
 * @param ctx The core context.
 */
function initViewportIpcListeners(ctx: CoreContext): void {
	ipcMain.on(`set-viewport`, (_event, [width, height]: [ViewportWidth, ViewportHeight]) => {
		ctx.$appWindow?.setContentSize(width, height + EYAS_HEADER_HEIGHT);
	});
}

/**
 * Initializes cache management IPC listeners.
 * @param ctx The core context.
 */
function initCacheIpcListeners(ctx: CoreContext): void {
	ipcMain.on(`clear-cache`, async () => {
		ctx.clearCache();
		await ctx.updateNavigationState();
	});

	ipcMain.on(`open-cache-folder`, () => {
		if (!ctx.$appWindow || ctx.$appWindow.isDestroyed()) { return; }
		const storagePath = ctx.$appWindow.webContents.session.getStoragePath();
		if (storagePath) {
			shell.openPath(storagePath);
		}
	});
}

/**
 * Initializes environment-related IPC listeners.
 * @param ctx The core context.
 */
function initEnvironmentIpcListeners(ctx: CoreContext): void {
	// update the network status
	ipcMain.on(`network-status`, (_event, status: IsActive) => {
		ctx.setTestNetworkEnabled(status);
		ctx.setMenu();
	});

	// listen for the user to select an environment
	ipcMain.on(`environment-selected`, (_event, domain: EnvironmentSelectedPayload) => {
		// support both legacy string (url only) and new object {url, key} formats
		const domainUrl = typeof domain === `string` ? domain : domain.url;
		const domainKey = typeof domain === `string` ? null : (domain.key ?? null);

		// update the test domain and env key
		ctx.setTestDomainRaw(domainUrl);
		const parsed = parseURL(domainUrl);
		ctx.setTestDomain(parsed ? parsed.toString() : domainUrl);
		ctx.setEnvKey(domainKey);

		// load the test
		ctx.setIsEnvironmentPending(false);
		ctx.navigate();
	});
}

/**
 * Initializes settings-related IPC listeners.
 * @param ctx The core context.
 */
function initSettingsIpcListeners(ctx: CoreContext): void {
	// listen for a setting to be saved from the UI
	ipcMain.on(`save-setting`, async (event, { key, value, projectId }: SaveSettingPayload) => {
		// 1. If a projectId is provided, it must match the currently-active project.
		// 2. If no (or mismatching) projectId is provided, it's an app-level (global) setting.
		const activeProjectId = ctx.$config?.meta?.projectId || null;
		const targetProjectId = (projectId && projectId === activeProjectId) ? activeProjectId : null;

		settingsService.set(key, value, targetProjectId ?? undefined);
		await settingsService.save();
		event.reply(`setting-saved`, { key, projectId: targetProjectId });

		// if the theme was updated, update the native theme
		if (key === `theme`) {
			// We can't directly call updateNativeTheme if it's in index.ts,
			// but we can trigger it via context if needed.
			// Actually, index.ts's updateNativeTheme just sets nativeTheme.themeSource.
			nativeTheme.themeSource = (value as `light` | `dark` | `system`) || `system`;
		}

		// notify the UI that a setting has changed
		ctx.$eyasLayer?.webContents?.send(`settings-updated`, { key, value, projectId: targetProjectId });
	});

	// listen for the UI to request the current settings
	ipcMain.on(`get-settings`, event => {
		// Always read from the currently-loaded project; do not accept a projectId
		// from the renderer to prevent cross-project data leakage.
		const activeProjectId = ctx.$config?.meta?.projectId || null;
		event.reply(`settings-loaded`, {
			project: settingsService.getProjectSettings(activeProjectId ?? undefined),
			app: settingsService.getAppSettings(),
			systemTheme: nativeTheme.shouldUseDarkColors ? `dark` : `light`,
			version: ctx._appVersion
		});
	});
}

/**
 * Initializes test server-related IPC listeners.
 * @param ctx The core context.
 */
function initTestServerIpcListeners(ctx: CoreContext): void {
	// test server setup modal: user clicked Continue, start the server
	ipcMain.on(`test-server-setup-continue`, (_event, { useHttps, autoOpenBrowser, useCustomDomain }: TestServerSetupPayload) => {
		ctx.setTestServerHttpsEnabled(!!useHttps);
		const parsed = parseURL(ctx.$testDomain);
		const customDomain = useCustomDomain ? (parsed instanceof URL ? parsed.hostname : `test.local`) : null;
		ctx.doStartTestServer(autoOpenBrowser, customDomain);
	});

	// test server resume modal: user clicked Resume
	ipcMain.on(`test-server-resume-confirm`, () => {
		// if there are previous settings, restart with them
		if (ctx.$lastTestServerOptions) {
			ctx.doStartTestServer();
		} else {
			// otherwise just start with defaults
			ctx.doStartTestServer();
		}
	});

	// test server active modal: user clicked End Session
	ipcMain.on(`test-server-stop`, () => ctx.stopTestServer());

	// test server active modal: user clicked Open in Browser
	ipcMain.on(`test-server-open-browser`, () => ctx.openTestServerInBrowserHandler());

	// test server active modal: user clicked Extend Session
	ipcMain.on(`test-server-extend`, () => {
		const state = testServer.getTestServerState();
		if (state) {
			// Session is actively running — add time without restarting the server
			if (ctx.$testServerEndTime !== null) {
				ctx.setTestServerEndTime(ctx.$testServerEndTime + TEST_SERVER_SESSION_DURATION_MS);
			}
			testServerTimeout.cancelTestServerTimeout();
			if (ctx.$testServerEndTime !== null) {
				testServerTimeout.startTestServerTimeout(ctx.onTestServerTimeout, ctx.$testServerEndTime - Date.now());
			}
			ctx.uiEvent(`show-test-server-active-modal`, {
				domain: state.customUrl || state.url,
				startTime: state.startedAt,
				endTime: ctx.$testServerEndTime
			});
		} else if (ctx.$lastTestServerOptions) {
			// Session has expired — restart it fresh
			ctx.doStartTestServer(false, ctx.$lastTestServerOptions.customDomain);
		}
	});
}
