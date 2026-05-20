import type { WebContents } from 'electron';
import { BrowserWindow, WebContentsView } from 'electron';
import type { CoreContext, WindowService } from '@registry/eyas-core.js';
import { MP_EVENTS } from './metrics-events.js';
import type { TimestampMS, GenericRecord } from '@registry/primitives.js';
import { EYAS_HEADER_HEIGHT } from '@scripts/constants.js';
import { registerShortcutListeners } from './window.shortcuts.js';
import { handleResize } from './window.resize.js';

function initTestWebContentsListeners(
	ctx: CoreContext,
	testWebContents: WebContents,
	$appWindow: BrowserWindow
): void {
	testWebContents.on(`did-finish-load`, () => {
		if (testWebContents.isDestroyed() || $appWindow.isDestroyed()) { return; }
		$appWindow.setTitle(ctx.getAppTitle(testWebContents.getTitle()));
		ctx.setMenu();

		// clear history if requested (e.g. on fresh test start)
		if (ctx.$shouldClearHistory) {
			testWebContents.navigationHistory.clear();
			ctx.setShouldClearHistory(false);
		}

		ctx.updateNavigationState();
	});

	testWebContents.on(`did-navigate-in-page`, () => {
		if (testWebContents.isDestroyed() || $appWindow.isDestroyed()) { return; }
		ctx.updateNavigationState();
	});

	testWebContents.on(`did-start-navigation`, (_event, url) => {
		ctx.setJSErrorsCount(0);
		ctx.setJSWarningsCount(0);
		if (!url.startsWith(`data:text/html`) && url !== `about:blank`) {
			if (ctx.$isInitializing) {
				ctx.setIsInitializing(false);
				ctx.setMenu();
			}
			ctx.updateNavigationState();
		}
	});

	testWebContents.on(`console-message`, (_event, level) => {
		if (testWebContents.isDestroyed() || $appWindow.isDestroyed()) { return; }
		const url = testWebContents.getURL();
		if (url.startsWith(`data:text/html`) || url === `about:blank`) { return; }
		if (level === 3) {
			ctx.setJSErrorsCount(ctx.$jsErrorsCount + 1);
			ctx.updateNavigationState();
		} else if (level === 2) {
			ctx.setJSWarningsCount(ctx.$jsWarningsCount + 1);
			ctx.updateNavigationState();
		}
	});

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
				partition: `persist:${$config?.meta.testId}`
			}
		});

		// Expose WCO configuration for E2E testing
		(window as unknown as GenericRecord)._titleBarOverlayConfig = overlayConfig;

		ctx.setAppWindow(window);

		// Create a dedicated child view for the test content, positioned below the header
		const testLayer = new WebContentsView({
			webPreferences: {
				preload: $paths.testPreload,
				partition: `persist:${$config?.meta.testId}`
			}
		});

		ctx.setTestLayer(testLayer);
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
	createSplashScreen(ctx: CoreContext): BrowserWindow {
		const { $config } = ctx;
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
				partition: `persist:${$config?.meta.testId}`
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
		const { $appWindow, $paths, $config } = ctx;
		if (!$appWindow) { return; }

		const isDev = process.argv.includes(`--dev`);
		const uiDomain = `ui://eyas.interface`;

		const layer = new WebContentsView({
			webPreferences: {
				preload: $paths.eventBridge,
				partition: `persist:${$config?.meta.testId}`,
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

	/**
	 * Initializes window-level event listeners.
	 * @param ctx The core context.
	 */
	initWindowListeners(ctx: CoreContext): void {
		const { $appWindow } = ctx;
		if (!$appWindow) { return; }

		$appWindow.on(`close`, ctx.manageAppClose);
		$appWindow.on(`resize`, () => handleResize(ctx));

		$appWindow.on(`page-title-updated`, (evt, title) => ctx.onTitleUpdate(evt, title));

		// Route content-load lifecycle events through the test layer (the child view)
		// so that title updates and navigation state track the *test* content, not the host window.
		const testWebContents = ctx.$testLayer?.webContents || $appWindow.webContents;

		initTestWebContentsListeners(ctx, testWebContents, $appWindow);

		$appWindow.webContents.on(`did-create-window`, win => {
			win.on(`page-title-updated`, (evt, title) => {
				if (win.isDestroyed()) { return; }
				evt.preventDefault();
				win.setTitle(ctx.getAppTitle(title));
			});

			win.webContents.on(`did-finish-load`, () => {
				if (win.isDestroyed() || win.webContents.isDestroyed()) { return; }
				win.setTitle(ctx.getAppTitle(win.webContents.getTitle()));
			});
		});
	},

	/**
	 * Handles window resize events.
	 * @param ctx The core context.
	 */
	handleResize(ctx: CoreContext): void {
		handleResize(ctx);
	},

	/**
	 * Initiates the core electron UI layer.
	 * @param ctx The core context.
	 */
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

		// Playwright's `electron.launch()` waits for the primary host BrowserWindow to finish its
		// initial navigation. Since our host window is just a bare container and we moved navigation
		// to the $testLayer, Playwright hangs forever. Navigating the window satisfies Playwright.
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
