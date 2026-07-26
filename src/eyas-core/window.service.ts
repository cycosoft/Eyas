import type { WebContents } from 'electron';
import { BrowserWindow, WebContentsView } from 'electron';
import type { CoreContext, WindowService } from '@registry/eyas-core.js';
import { MP_EVENTS } from './metrics-events.js';
import type { TimestampMS, GenericRecord } from '@registry/primitives.js';
import { EYAS_HEADER_HEIGHT, EYAS_UI_PARTITION, getTestPartition } from '@scripts/constants.js';
import { registerShortcutListeners } from './window.shortcuts.js';
import { handleResize } from './window.resize.js';
import * as sessionRecorderService from './session-recorder.service.js';
import { registerPopupTracking } from './window.popups.js';
import { registerAppShellPopupTitleSync } from './window.popup-titles.js';

function setupConsoleMessageListener(
	ctx: CoreContext,
	testWebContents: WebContents,
	$appWindow: BrowserWindow
): void {
	testWebContents.on(`console-message`, event => {
		if (testWebContents.isDestroyed() || $appWindow.isDestroyed()) { return; }
		const url = testWebContents.getURL();
		if (url.startsWith(`data:text/html`) || url === `about:blank`) { return; }

		const level = event?.level;
		if (level === `error`) {
			ctx.setJSErrorsCount(ctx.$jsErrorsCount + 1);
			ctx.updateNavigationState();
		} else if (level === `warning`) {
			ctx.setJSWarningsCount(ctx.$jsWarningsCount + 1);
			ctx.updateNavigationState();
		}
	});
}

function initTestWebContentsListeners(
	ctx: CoreContext,
	testWebContents: WebContents,
	$appWindow: BrowserWindow
): void {
	// syncs title changes after load; explicitSet: false means Chromium synthesized `title`
	// (e.g. the page URL) for a blank document.title, so treat that case as truly blank
	testWebContents.on(`page-title-updated`, (_evt, title, explicitSet) => {
		if (testWebContents.isDestroyed() || $appWindow.isDestroyed()) { return; }
		const pageTitle = explicitSet === false ? `` : title;
		$appWindow.setTitle(ctx.getAppTitle(pageTitle));
		ctx.updateNavigationState(pageTitle);
	});

	testWebContents.on(`did-finish-load`, () => {
		if (testWebContents.isDestroyed() || $appWindow.isDestroyed()) { return; }
		$appWindow.setTitle(ctx.getAppTitle(testWebContents.getTitle()));
		ctx.setMenu();

		// clear history if requested (e.g. on fresh test start)
		const isFreshTestStart = ctx.$shouldClearHistory;
		if (isFreshTestStart) {
			testWebContents.navigationHistory.clear();
			ctx.setShouldClearHistory(false);
		}

		// only (re)start recording on the initial test load, not on every subsequent
		// in-app navigation's did-finish-load
		if (isFreshTestStart) {
			sessionRecorderService.startSession(ctx).catch(() => {});
		}
		ctx.updateNavigationState();
	});

	testWebContents.on(`did-navigate-in-page`, () => {
		if (testWebContents.isDestroyed() || $appWindow.isDestroyed()) { return; }
		ctx.updateNavigationState();
	});

	testWebContents.on(`did-start-navigation`, (_event, url, _isInPlace, isMainFrame) => {
		if (!isMainFrame) { return; }

		ctx.setJSErrorsCount(0);
		ctx.setJSWarningsCount(0);
		if (!url.startsWith(`data:text/html`) && url !== `about:blank`) {
			if (ctx.$isInitializing) {
				ctx.setIsInitializing(false);
				ctx.setMenu();
			}
			sessionRecorderService.appendNavigateStep(url);
			ctx.updateNavigationState();
		}
	});

	setupConsoleMessageListener(ctx, testWebContents, $appWindow);

	testWebContents.on(`did-fail-load`, (_event, errorCode, errorDescription) => {
		console.error(`Navigation failed: ${errorCode} - ${errorDescription}`);
	});
}

// Service for managing application windows and layers.
export const windowService: WindowService = {
	// Creates the main application window.
	createAppWindow(ctx: CoreContext): void {
		const { $currentViewport, $paths, $config } = ctx;

		const overlayConfig = {
			color: `#f7f9fb`,
			symbolColor: `#191c1e`,
			height: 30
		};

		const window = new BrowserWindow({
			useContentSize: true,
			width: $currentViewport[0],
			height: $currentViewport[1] + EYAS_HEADER_HEIGHT,
			title: ctx.getAppTitle(),
			icon: $paths.icon,
			show: false,
			titleBarStyle: `hidden`,
			titleBarOverlay: overlayConfig,
			webPreferences: {
				partition: EYAS_UI_PARTITION
			}
		});

		// Expose WCO configuration for E2E testing
		(window as unknown as GenericRecord)._titleBarOverlayConfig = overlayConfig;

		ctx.setAppWindow(window);

		// Create a dedicated child view for the test content, positioned below the header
		const testLayer = new WebContentsView({
			webPreferences: {
				partition: getTestPartition($config?.meta.testId),
				// required for the recorder preload to load into iframes (session-recording capture)
				nodeIntegrationInSubFrames: true
			}
		});

		ctx.setTestLayer(testLayer);
		testLayer.webContents.session.registerPreloadScript({ type: `frame`, filePath: $paths.testPreload });
		testLayer.webContents.session.registerPreloadScript({ type: `frame`, filePath: $paths.recorderPreload });
		registerPopupTracking(testLayer.webContents);
		registerShortcutListeners(ctx, testLayer.webContents);
		window.contentView.addChildView(testLayer);
		testLayer.setBounds({
			x: 0,
			y: EYAS_HEADER_HEIGHT,
			width: $currentViewport[0],
			height: $currentViewport[1]
		});
	},

	// Creates a splash screen window.
	createSplashScreen(_ctx: CoreContext): BrowserWindow {
		const isDev = process.argv.includes(`--dev`);
		const uiDomain = `ui://eyas.interface`;

		const splashScreen = new BrowserWindow({
			width: 400,
			height: 400,
			frame: false,
			transparent: true,
			alwaysOnTop: true,
			show: false,
			webPreferences: {
				partition: EYAS_UI_PARTITION
			}
		});

		const splashUrl = (isDev && process.env[`ELECTRON_RENDERER_URL`])
			? `${process.env[`ELECTRON_RENDERER_URL`]}/splash.html`
			: `${uiDomain}/splash.html`;

		splashScreen.webContents.loadURL(splashUrl);

		splashScreen.webContents.on(`did-finish-load`, () => {
			if (splashScreen.isDestroyed()) { return; }
			splashScreen.center();
			splashScreen.show();
		});

		return splashScreen;
	},

	// Initializes the Eyas UI layer as a WebContentsView.
	initEyasLayer(ctx: CoreContext, splashScreen: BrowserWindow, splashVisible: TimestampMS): void {
		const { $appWindow, $paths } = ctx;
		if (!$appWindow) { return; }

		const isDev = process.argv.includes(`--dev`);
		const uiDomain = `ui://eyas.interface`;

		const layer = new WebContentsView({
			webPreferences: {
				preload: $paths.eventBridge,
				partition: EYAS_UI_PARTITION,
				backgroundThrottling: false
			}
		});

		ctx.setEyasLayer(layer);
		$appWindow.contentView.addChildView(layer);

		// set the initial bounds
		const [winWidth] = $appWindow.getContentSize();
		layer.setBounds({
			x: 0,
			y: 0,
			width: winWidth,
			height: EYAS_HEADER_HEIGHT
		});

		// make the layer transparent
		layer.setBackgroundColor(`#00000000`);

		const url = (isDev && process.env[`ELECTRON_RENDERER_URL`])
			? `${process.env[`ELECTRON_RENDERER_URL`]}/index.html`
			: `${uiDomain}/index.html`;

		layer.webContents.loadURL(url);
		registerShortcutListeners(ctx, layer.webContents);

		layer.webContents.on(`did-finish-load`, async () => {
			if (layer.webContents.isDestroyed()) { return; }
			await ctx.startAFreshTest();
			ctx.updateNavigationState();
			ctx.checkStartupSequence();

			const splashMinTime = 750;
			const splashDelta = performance.now() - splashVisible;
			const splashTimeout = splashDelta > splashMinTime ? 0 : splashMinTime - splashDelta;

			setTimeout(() => {
				if (ctx.$appWindow?.isDestroyed() || splashScreen.isDestroyed()) { return; }
				ctx.$appWindow?.show();
				handleResize(ctx);
				splashScreen.destroy();
			}, splashTimeout);
		});
	},
	// Initializes window-level event listeners.
	initWindowListeners(ctx: CoreContext): void {
		const { $appWindow } = ctx;
		if (!$appWindow) { return; }

		$appWindow.on(`close`, ctx.manageAppClose);
		$appWindow.on(`resize`, () => handleResize(ctx));

		$appWindow.on(`page-title-updated`, (evt, title) => ctx.onTitleUpdate(evt, title));

		// Route content-load lifecycle events through the test layer
		const testWebContents = ctx.$testLayer?.webContents || $appWindow.webContents;

		initTestWebContentsListeners(ctx, testWebContents, $appWindow);
		registerAppShellPopupTitleSync(ctx, $appWindow.webContents);
	},

	// Handles window resize events.
	handleResize(ctx: CoreContext): void {
		handleResize(ctx);
	},

	// Initiates the core electron UI layer.
	async initElectronUi(ctx: CoreContext): Promise<void> {
		const { $defaultViewports, $currentViewport } = ctx;

		// set the current viewport to the first viewport in the list
		$currentViewport[0] = $defaultViewports[0].width;
		$currentViewport[1] = $defaultViewports[0].height;

		this.createAppWindow(ctx);
		ctx.setupWebRequestInterception();

		// display the splash screen to the user
		const splashScreen = this.createSplashScreen(ctx);

		// track the time the splash screen was created as a backup
		let splashVisible = performance.now();

		// when the splash screen content has loaded, set a new more specific time
		splashScreen.webContents.on(`did-finish-load`, () => {
			if (splashScreen.isDestroyed()) { return; }
			splashVisible = performance.now();
		});

		// load a default blank page into the test layer so the background doesn't show as black
		const blankPage = `data:text/html,` + encodeURIComponent(`<html><body></body></html>`);
		ctx.$testLayer?.webContents.loadURL(blankPage);

		// Satisfy Playwright's electron.launch() which waits for host window initial navigation
		ctx.$appWindow?.loadURL(blankPage);

		// track the app launch event
		ctx.trackEvent(MP_EVENTS.core.launch);

		// exit the app if the test has expired
		ctx.checkExpiration();

		// listen for app events
		this.initWindowListeners(ctx);
		ctx.initIpcHandlers();
		this.initEyasLayer(ctx, splashScreen, splashVisible);
	}
};
