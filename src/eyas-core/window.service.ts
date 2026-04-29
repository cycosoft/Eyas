import { BrowserWindow, WebContentsView } from 'electron';
import type { CoreContext, WindowService } from '@registry/eyas-core.js';
import { MP_EVENTS } from './metrics-events.js';
import type { TimestampMS } from '@registry/primitives.js';
import { EYAS_HEADER_HEIGHT } from '@scripts/constants.js';

/**
 * Service for managing application windows and layers.
 */
export const windowService: WindowService = {
	/**
	 * Creates the main application window.
	 * @param ctx The core context.
	 */
	createAppWindow(ctx: CoreContext): void {
		const { $currentViewport, $paths, $config } = ctx;

		const window = new BrowserWindow({
			useContentSize: true,
			width: $currentViewport[0],
			height: $currentViewport[1] + EYAS_HEADER_HEIGHT,
			title: ctx.getAppTitle(),
			icon: $paths.icon,
			show: false,
			webPreferences: {
				partition: `persist:${$config?.meta.testId}`
			}
		});

		ctx.setAppWindow(window);

		// Create a dedicated child view for the test content, positioned below the header
		const testLayer = new WebContentsView({
			webPreferences: {
				preload: $paths.testPreload,
				partition: `persist:${$config?.meta.testId}`
			}
		});

		ctx.setTestLayer(testLayer);
		window.contentView.addChildView(testLayer);
		testLayer.setBounds({
			x: 0,
			y: EYAS_HEADER_HEIGHT,
			width: $currentViewport[0],
			height: $currentViewport[1]
		});
	},

	/**
	 * Creates a splash screen window.
	 * @param ctx The core context.
	 * @returns The created splash screen window.
	 */
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
			splashScreen.center();
			splashScreen.show();
		});

		return splashScreen;
	},

	/**
	 * Initializes the Eyas UI layer as a WebContentsView.
	 * @param ctx The core context.
	 * @param splashScreen The splash screen window.
	 * @param splashVisible The timestamp when the splash screen became visible.
	 */
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
		layer.setBounds({
			x: 0,
			y: 0,
			width: ctx.$currentViewport[0],
			height: ctx.$currentViewport[1]
		});

		// make the layer transparent
		layer.setBackgroundColor(`#00000000`);

		const url = (isDev && process.env[`ELECTRON_RENDERER_URL`])
			? `${process.env[`ELECTRON_RENDERER_URL`]}/index.html`
			: `${uiDomain}/index.html`;

		layer.webContents.loadURL(url);

		layer.webContents.on(`did-finish-load`, async () => {
			await ctx.startAFreshTest();
			ctx.checkStartupSequence();

			const splashMinTime = 750;
			const splashDelta = performance.now() - splashVisible;
			const splashTimeout = splashDelta > splashMinTime ? 0 : splashMinTime - splashDelta;

			setTimeout(() => {
				ctx.$appWindow?.show();
				windowService.handleResize(ctx);
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
		$appWindow.on(`resize`, () => this.handleResize(ctx));

		$appWindow.on(`page-title-updated`, (evt, title) => ctx.onTitleUpdate(evt, title));

		// Route content-load lifecycle events through the test layer (the child view)
		// so that title updates and navigation state track the *test* content, not the host window.
		const testWebContents = ctx.$testLayer?.webContents || $appWindow.webContents;

		testWebContents.on(`did-finish-load`, () => {
			$appWindow.setTitle(ctx.getAppTitle(testWebContents.getTitle()));
			ctx.setMenu();
		});

		testWebContents.on(`did-start-navigation`, (_event, url) => {
			if (!url.startsWith(`data:text/html`) && url !== `about:blank`) {
				if (ctx.$isInitializing) {
					ctx.setIsInitializing(false);
					ctx.setMenu();
				}
			}
		});

		testWebContents.on(`did-fail-load`, (_event, errorCode, errorDescription) => {
			console.error(`Navigation failed: ${errorCode} - ${errorDescription}`);
		});

		$appWindow.webContents.on(`did-create-window`, win => {
			win.on(`page-title-updated`, (evt, title) => {
				evt.preventDefault();
				win.setTitle(ctx.getAppTitle(title));
			});

			win.webContents.on(`did-finish-load`, () => {
				win.setTitle(ctx.getAppTitle(win.webContents.getTitle()));
			});
		});
	},

	/**
	 * Handles window resize events.
	 * @param ctx The core context.
	 */
	handleResize(ctx: CoreContext): void {
		const { $appWindow, $eyasLayer, $testLayer, $currentViewport } = ctx;
		if (!$appWindow) { return; }

		const [newWidth, newHeight] = $appWindow.getContentSize();
		
		// update the viewport state
		$currentViewport[0] = newWidth;
		$currentViewport[1] = newHeight;

		// Resize the UI layer if it exists
		if ($eyasLayer) {
			// determine if the UI layer is currently active (full screen) or passive (header only)
			// by comparing its current height to the known header height constant.
			const currentLayerHeight = $eyasLayer.getBounds().height;
			const isActive = currentLayerHeight > EYAS_HEADER_HEIGHT;
			const newLayerHeight = isActive ? newHeight : EYAS_HEADER_HEIGHT;

			$eyasLayer.setBounds({ x: 0, y: 0, width: newWidth, height: newLayerHeight });
		}

		// Resize the test content layer if it exists
		if ($testLayer) {
			$testLayer.setBounds({
				x: 0,
				y: EYAS_HEADER_HEIGHT,
				width: newWidth,
				height: newHeight - EYAS_HEADER_HEIGHT
			});
		}

		ctx.setMenu();
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
		splashScreen.webContents.on(`did-finish-load`, () => { splashVisible = performance.now(); });

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
