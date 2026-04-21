import {
	app,
	BrowserWindow,
	Menu,
	nativeTheme,
	BrowserView,
	dialog,
	shell,
	clipboard
} from 'electron';
import _path from 'node:path';
import fs from 'node:fs';
import { isPast } from 'date-fns/isPast';
import { format } from 'date-fns/format';
import { differenceInDays } from 'date-fns/differenceInDays';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;
import semver from 'semver';

// only allow a single instance of the app to be at a time
const _electronCore = app;
const _electronWindow = BrowserWindow;
const isPrimaryInstance = _electronCore.requestSingleInstanceLock();
if (!isPrimaryInstance) {
	console.log(``);
	console.log(`Another instance of the app is already running. Exiting.`);
	console.log(``);

	_electronCore.quit();
}

// Internal modules
import $roots from '@scripts/get-roots.js';
import { parseURL } from '@scripts/parse-url.js';
import { buildMenuTemplate } from './menu-template.js';
import { getNoUpdateAvailableDialogOptions } from './update-dialog.js';
import { MP_EVENTS } from './metrics-events.js';
import { analyticsService } from './analytics.service.js';
import * as testServer from './test-server/test-server.js';
import { testServerService } from './test-server.service.js';
import { substituteEnvVariables, isVariableLinkValid, hasRemainingVariables } from '@scripts/variable-utils.js';
import * as settingsService from './settings-service.js';
import { getAppTitle, sanitizePageTitle } from '@scripts/get-app-title.js';
import { LOAD_TYPES } from '@scripts/constants.js';

import { initIpcHandlers } from './ipc-handlers.js';
import {
	registerInternalProtocols,
	setupEyasNetworkHandlers,
	setupWebRequestInterception
} from './protocol-handlers.js';
import type { CoreContext, EyasPaths } from '@registry/eyas-core.js';

// Types
import type { ValidatedConfig, LinkConfig } from '@registry/config.js';
import type { MenuContext, MenuTemplate, MenuContextParams, LinkMenuHandlers } from '@registry/menu.js';
import type { DeepLinkContext } from '@registry/deep-link.js';
import type { TestServerOptions } from '@registry/test-server.js';
import type { Viewport, ConfigToLoad, StartupModal, AppSettings, EnvironmentSettings, PreventableEvent, ViewportSize, FocusUI } from '@registry/core.js';
import type { ViewportWidth, ViewportHeight, ViewportLabel, ChannelName, IsActive, IsPending, DomainUrl, FormattedDuration, MPEventName, TimestampMS, HashString, ThemeSource, AppTitle, AppVersion, EnvironmentKey } from '@registry/primitives.js';

// global variables $
const $isDev = process.argv.includes(`--dev`);
let $appWindow: BrowserWindow | null = null;
let $eyasLayer: BrowserView | null = null;
let $config: ValidatedConfig | null = null;
let $configToLoad: ConfigToLoad = {};
let $testNetworkEnabled: IsActive = true;
let $testServerHttpsEnabled: IsActive = false;
let $lastTestServerOptions: TestServerOptions | null = null;
let $testServerEndTime: number | null = null;
let $testDomainRaw: string | null = null;
let $testDomain = `eyas://local.test`;
let $envKey: string | null = null;
const $uiDomain = `ui://eyas.interface`;
const $defaultViewports: Viewport[] = [
	{ isDefault: true, label: `Desktop` as ViewportLabel, width: 1366 as ViewportWidth, height: 768 as ViewportHeight },
	{ isDefault: true, label: `Tablet` as ViewportLabel, width: 768 as ViewportWidth, height: 1024 as ViewportHeight },
	{ isDefault: true, label: `Mobile` as ViewportLabel, width: 360 as ViewportWidth, height: 640 as ViewportHeight }
];
let $allViewports: Viewport[] = [];
const $currentViewport: ViewportSize = [0, 0];
let $updateStatus = `idle`;
let $isInitializing: IsActive = true;
let $isEnvironmentPending: IsPending = false;
let $updateCheckUserTriggered = false;
let $onCheckForUpdates = (): void => { };
let $onInstallUpdate = (): void => { };
let $pendingStartupModal: StartupModal | null = null;
let $isStartupSequenceChecked: IsActive = false;
let $latestChangelogVersion: string | null = null;

const $paths = {
	icon: _path.join($roots.eyas, `eyas-assets`, `eyas-logo.png`),
	configLoader: _path.join($roots.eyas, `scripts`, `get-config.js`),
	packageJson: _path.join($roots.eyas, `..`, `package.json`),
	testPreload: _path.join($roots.eyas, `scripts`, `test-preload.js`),
	eventBridge: _path.join($roots.eyas, `scripts`, `event-bridge.js`),
	constants: _path.join($roots.eyas, `scripts`, `constants.js`),
	pathUtils: _path.join($roots.eyas, `scripts`, `path-utils.js`),
	timeUtils: _path.join($roots.eyas, `scripts`, `time-utils.js`),
	testSrc: `` as string | null,
	uiSource: _path.join($roots.eyas, `eyas-interface`),
	eyasInterface: _path.join($roots.eyas, `eyas-interface`, `index.html`),
	splashScreen: _path.join($roots.eyas, `eyas-interface`, `splash.html`)
};

// eslint-disable-next-line quotes
import _package from "@root/package.json" with { type: "json" };
const _appVersion = _package.version;

const APP_NAME = `Eyas`;

/**
 * djb2 hash of a domains array — detects any structural change
 * (add, remove, reorder, URL edit) without any external dependencies.
 * @param {object[]} domains
 * @returns {string} unsigned 32-bit hex string
 */
function hashDomains(domains: unknown[]): HashString {
	const str = JSON.stringify(domains);
	let h = 5381;
	for (let i = 0; i < str.length; i++) { h = (h * 33) ^ str.charCodeAt(i); }
	return (h >>> 0).toString(16);
}

// ─── helpers ──────────────────────────────────────────────────────────────────
/**
 * update the native theme of the app to match the theme source
 * @param {string} themeSource - the theme source to apply (e.g. 'light', 'dark', 'system')
 */
function updateNativeTheme(themeSource?: ThemeSource): void {
	nativeTheme.themeSource = (themeSource as `light` | `dark` | `system`) || `system`;
}

// OS Listener
nativeTheme.on(`updated`, () => {
	const currentSetting = settingsService.get(`theme`) as string;
	if (currentSetting === `system`) {
		$eyasLayer?.webContents?.send(`system-theme-updated`, nativeTheme.shouldUseDarkColors ? `dark` : `light`);
	}
});

// APP_ENTRY: initialize the first layer of the app
initElectronCore();

// start the core of the application
async function initElectronCore(): Promise<void> {
	const {
		handleEyasProtocolUrl,
		getEyasUrlFromCommandLine
	} = await import(`./deep-link-handler.js`);

	setupDefaultProtocol();

	const deepLinkContext: DeepLinkContext = {
		getAppWindow: () => $appWindow,
		setConfigToLoad: p => { $configToLoad = p; },
		loadConfig: async (method, path) => {
			const getConfig = (await import(`../scripts/get-config.js`)).default;
			$config = await getConfig(method, path);
		},
		startAFreshTest,
		LOAD_TYPES
	};

	setupDeepLinkListeners(deepLinkContext, handleEyasProtocolUrl, getEyasUrlFromCommandLine);

	// add support for eyas:// protocol
	registerInternalProtocols();

	// start the electron layer
	_electronCore.whenReady().then(handleAppReady);
}

/**
 * Sets up the default protocol client for the application.
 */
export function setupDefaultProtocol(): void {
	if (process.defaultApp) {
		if (process.argv.length >= 2) {
			_electronCore.setAsDefaultProtocolClient(
				`eyas`,
				process.execPath,
				[_path.resolve(process.argv[1])]
			);
		} else {
			_electronCore.setAsDefaultProtocolClient(`eyas`);
		}
	} else {
		_electronCore.setAsDefaultProtocolClient(`eyas`);
	}
}

/**
 * Sets up listeners for deep links and second instance events.
 * @param context The deep link context.
 * @param handler The protocol URL handler.
 * @param urlGetter The command line URL getter.
 */
export function setupDeepLinkListeners(
	context: DeepLinkContext,
	handler: (url: DomainUrl, ctx: DeepLinkContext) => void,
	urlGetter: (args: string[]) => DomainUrl | undefined | null
): void {
	// macOS: detect if the app was opened with a file
	_electronCore.on(`open-file`, async (_event, path) => {
		if (!path.endsWith(`.eyas`)) { return; }

		if ($appWindow) {
			const getConfig = (await import(`../scripts/get-config.js`)).default;
			$config = await getConfig(LOAD_TYPES.ASSOCIATION, path);
			startAFreshTest();
		} else {
			$configToLoad = { method: LOAD_TYPES.ASSOCIATION, path };
		}
	});

	// macOS: handle eyas:// protocol (open-url)
	_electronCore.on(`open-url`, (_event, url) => {
		_event.preventDefault();
		handler(url, context);
	});

	// Windows/Linux: handle second instance with protocol URL
	_electronCore.on(`second-instance`, (_event, commandLine) => {
		if ($appWindow) {
			if ($appWindow.isMinimized()) { $appWindow.restore(); }
			$appWindow.focus();
		}
		const url = urlGetter(commandLine);
		if (url) {
			handler(url, context);
		}
	});
}

/**
 * Handles the application ready event.
 */
async function handleAppReady(): Promise<void> {
	// get config based on the context
	const getConfig = (await import(`../scripts/get-config.js`)).default;
	$config = await getConfig($configToLoad.method || LOAD_TYPES.AUTO, $configToLoad.path);

	// load user settings from disk before first test start
	await settingsService.load();
	updateNativeTheme(settingsService.get(`theme`) as string);

	// start listening for requests to the custom protocol
	setupEyasNetworkHandlers(getCoreContext());

	// start the UI layer
	initElectronUi();

	setupAutoUpdater();

	// if Electron receives the `activate` event
	_electronCore.on(`activate`, () => {
		// if the window does not already exist, create it
		if (!_electronWindow.getAllWindows().length) {
			initElectronUi();
		}
	});
}

// initiate the core electron UI layer
async function initElectronUi(): Promise<void> {
	// set the current viewport to the first viewport in the list
	$currentViewport[0] = $defaultViewports[0].width;
	$currentViewport[1] = $defaultViewports[0].height;

	createAppWindow();
	setupWebRequestInterception(getCoreContext());

	// display the splash screen to the user
	const splashScreen = createSplashScreen();

	// track the time the splash screen was created as a backup
	let splashVisible = performance.now();

	// when the splash screen content has loaded, set a new more specific time
	splashScreen.webContents.on(`did-finish-load`, () => { splashVisible = performance.now(); });

	// load a default page so the app doesn't start black
	$appWindow?.loadURL(`data:text/html,` + encodeURIComponent(`<html><body></body></html>`));

	// track the app launch event
	trackEvent(MP_EVENTS.core.launch);

	// exit the app if the test has expired
	// NOTE: THIS NEEDS TO BE MOVED TO THE UI LAYER
	checkTestExpiration();

	// listen for app events
	initTestListeners();
	initUiListeners();

	initEyasLayer(splashScreen, splashVisible);
}

/**
 * Creates the main application window.
 */
export function createAppWindow(): void {
	$appWindow = new _electronWindow({
		useContentSize: true,
		width: $currentViewport[0],
		height: $currentViewport[1],
		title: getAppTitleWithContext(),
		icon: $paths.icon as string,
		show: false,
		webPreferences: {
			preload: $paths.testPreload,
			partition: `persist:${$config?.meta.testId}`
		}
	});
}

/**
 * Sets up web request interception for the application window.
 */

/**
 * Initializes the Eyas UI layer.
 * @param splashScreen The splash screen window.
 * @param splashVisible The time when the splash screen became visible.
 */
function initEyasLayer(splashScreen: BrowserWindow, splashVisible: TimestampMS): void {
	if (!$appWindow) { return; }

	$eyasLayer = new BrowserView({
		webPreferences: {
			preload: $paths.eventBridge,
			partition: `persist:${$config?.meta.testId}`,
			backgroundThrottling: false // allow to update even when hidden (e.g. modal close)
		}
	});
	$appWindow.addBrowserView($eyasLayer);

	const url = ($isDev && process.env[`ELECTRON_RENDERER_URL`])
		? `${process.env[`ELECTRON_RENDERER_URL`]}/index.html`
		: `${$uiDomain}/index.html`;
	$eyasLayer.webContents.loadURL(url);

	// once the Eyas UI layer is ready, attempt navigation
	$eyasLayer.webContents.on(`did-finish-load`, async () => {
		// start the test
		await startAFreshTest();

		// set a minimum time for the splash screen to be visible
		const splashMinTime = 750;
		const splashDelta = performance.now() - splashVisible;
		const splashTimeout = splashDelta > splashMinTime ? 0 : splashMinTime - splashDelta;
		setTimeout(() => {
			// show the app window
			$appWindow?.show();

			// we're done with the splash screen
			splashScreen.destroy();
		}, splashTimeout);
	});
}

// create a splash screen to display to the user while we wait for the $eyasLayer to load
function createSplashScreen(): BrowserWindow {

	// create the splash screen
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

	// load the splash screen
	const splashUrl = ($isDev && process.env[`ELECTRON_RENDERER_URL`])
		? `${process.env[`ELECTRON_RENDERER_URL`]}/splash.html`
		: `${$uiDomain}/splash.html`;
	splashScreen.webContents.loadURL(splashUrl);

	// when the splash screen content has loaded
	splashScreen.webContents.on(`did-finish-load`, () => {
		// center the splash screen
		splashScreen.center();

		// show the splash screen
		splashScreen.show();
	});

	// return the splashscreen handle so it can be later destroyed
	return splashScreen;
}

// initialize the listeners on the test content
function initTestListeners(): void {
	if (!$appWindow) { return; }

	// listen for the window to close
	$appWindow.on(`close`, manageAppClose);

	// listen for changes to the window size
	$appWindow.on(`resize`, onResize);

	// Whenever a title update is requested
	$appWindow.on(`page-title-updated`, onTitleUpdate);

	// Whenever the content is loaded on the app window
	$appWindow.webContents.on(`did-finish-load`, () => {
		// update the title, preserving the current page title
		$appWindow?.setTitle(getAppTitleWithContext($appWindow.webContents.getTitle()));

		// update the cache menu
		setMenu();
	});

	// when navigation starts
	$appWindow.webContents.on(`did-start-navigation`, (_event, url) => {
		// if the url is not the placeholder data url or about:blank
		if (!url.startsWith(`data:text/html`) && url !== `about:blank`) {
			// if the app is still initializing
			if ($isInitializing) {
				// update the initialization state
				$isInitializing = false;

				// update the menu
				setMenu();
			}
		}
	});

	// when there's a navigation failure
	$appWindow.webContents.on(`did-fail-load`, (_event, errorCode, errorDescription) => {
		// log the error
		console.error(`Navigation failed: ${errorCode} - ${errorDescription}`);
	});

	// when the test content opens a new window (e.g. target="_blank")
	$appWindow.webContents.on(`did-create-window`, win => {
		// Apply our title format when the new window's page title updates
		win.on(`page-title-updated`, (evt, title) => {
			evt.preventDefault();
			const rawUrl = win.webContents.getURL();
			const url = rawUrl?.startsWith(`data:`) ? undefined : rawUrl;
			win.setTitle(getAppTitle($config?.title || ``, $config?.version || ``, url, sanitizePageTitle(title, rawUrl)));
		});

		// Also apply our format when the new window finishes loading
		win.webContents.on(`did-finish-load`, () => {
			const rawUrl = win.webContents.getURL();
			const url = rawUrl?.startsWith(`data:`) ? undefined : rawUrl;
			win.setTitle(getAppTitle($config?.title || ``, $config?.version || ``, url, sanitizePageTitle(win.webContents.getTitle(), rawUrl)));
		});
	});
}

// initialize the Eyas listeners
function initUiListeners(): void {
	initIpcHandlers(getCoreContext());
}

let $coreContext: CoreContext | null = null;

/**
 * Assembles the core context object for the application.
 * @returns The fully assembled CoreContext object.
 */
function getCoreContext(): CoreContext {
	if ($coreContext) { return $coreContext; }

	$coreContext = {
		// State
		get $appWindow(): BrowserWindow | null { return $appWindow; },
		get $eyasLayer(): BrowserView | null { return $eyasLayer; },
		get $config(): ValidatedConfig | null { return $config; },
		get $testNetworkEnabled(): IsActive { return $testNetworkEnabled; },
		get $testServerHttpsEnabled(): IsActive { return $testServerHttpsEnabled; },
		get $lastTestServerOptions(): TestServerOptions | null { return $lastTestServerOptions; },
		get $testDomainRaw(): DomainUrl | null { return $testDomainRaw; },
		get $testDomain(): DomainUrl { return $testDomain; },
		get $envKey(): EnvironmentKey | null { return $envKey; },
		get $isEnvironmentPending(): IsPending { return $isEnvironmentPending; },
		get $testServerEndTime(): TimestampMS | null { return $testServerEndTime; },
		get $latestChangelogVersion(): AppVersion | null { return $latestChangelogVersion; },
		get $isStartupSequenceChecked(): IsActive { return $isStartupSequenceChecked; },
		get $isInitializing(): IsActive { return $isInitializing; },
		get $paths(): EyasPaths { return $paths as EyasPaths; },
		get _appVersion(): AppVersion { return _appVersion as AppVersion; },

		// Setters
		setTestNetworkEnabled: (enabled: IsActive): void => { $testNetworkEnabled = enabled; },
		setTestServerHttpsEnabled: (enabled: IsActive): void => { $testServerHttpsEnabled = enabled; },
		setTestDomainRaw: (domain: DomainUrl | null): void => { $testDomainRaw = domain; },
		setTestDomain: (domain: DomainUrl): void => { $testDomain = domain; },
		setEnvKey: (key: EnvironmentKey | null): void => { $envKey = key; },
		setIsEnvironmentPending: (pending: IsPending): void => { $isEnvironmentPending = pending; },
		setLatestChangelogVersion: (version: AppVersion | null): void => { $latestChangelogVersion = version; },
		setIsStartupSequenceChecked: (checked: IsActive): void => { $isStartupSequenceChecked = checked; },
		setTestServerEndTime: (time: TimestampMS | null): void => { $testServerEndTime = time; },
		setLastTestServerOptions: (options: TestServerOptions | null): void => { $lastTestServerOptions = options; },
		setIsInitializing: (initializing: IsActive): void => { $isInitializing = initializing; },

		// Functions
		toggleEyasUI,
		trackEvent,
		stopTestServer,
		checkStartupSequence,
		navigate,
		setMenu,
		doStartTestServer,
		openTestServerInBrowserHandler,
		uiEvent,
		onTestServerTimeout,
		onToggleTestServerHttps,
		onOpenSettings,
		triggerBufferedModal,
		manageAppClose
	};

	return $coreContext as CoreContext;
}

// method for tracking events
async function trackEvent(event: MPEventName, extraData?: Record<string, unknown>): Promise<void> {
	await analyticsService.init($isDev);
	await analyticsService.trackEvent(event, $config, _appVersion, extraData);
}

// forces an exit if the loaded test has expired
function checkTestExpiration(): void {
	if (!$config) { return; }

	// setup
	const expirationDate = new Date($config.meta.expires);

	// stop if the test has not expired
	if (!isPast(expirationDate)) { return; }

	// alert the user that the test has expired
	dialog.showMessageBoxSync({
		title: `🚫 Test Expired`,
		message: `This test expired on ${format(expirationDate, `PPP`)} and can no longer be used`,
		buttons: [`Exit`],
		noLink: true
	});

	// track that the app is being closed
	trackEvent(MP_EVENTS.core.exit);

	// Exit the app
	_electronCore.quit();
}

// Get the app title
function getAppTitleWithContext(rawPageTitle?: AppTitle): AppTitle {
	const rawUrl = $appWindow ? $appWindow.webContents.getURL() : null;

	// ignore data: URLs in the address bar
	const url = (rawUrl?.startsWith(`data:`) ? undefined : rawUrl) || undefined;

	// Sanitize the page title against the raw URL (before data: nulling)
	const pageTitle = sanitizePageTitle(rawPageTitle, rawUrl || ``);

	// Return the built title
	return getAppTitle($config?.title || ``, $config?.version || ``, url, pageTitle);
}

// manage automatic title updates
function onTitleUpdate(evt: PreventableEvent, title: AppTitle): void {
	// Disregard the default behavior
	evt.preventDefault();

	// update the title, passing the new document.title
	$appWindow?.setTitle(getAppTitleWithContext(title));
}

// focus the UI layer
const focusUI: FocusUI = () => {
	if (!$eyasLayer) { return; }

	// track the number of attempts to focus the UI to prevent infinite loops
	focusUI.attempts = focusUI.attempts || 0;
	focusUI.attempts++;

	// if the number of attempts is greater than 5
	if (focusUI.attempts > 5) {
		// reset the number of attempts
		focusUI.attempts = 0;

		// stop trying to focus the UI
		return;
	}

	// give the layer focus
	$eyasLayer.webContents.focus();

	// check if the UI is focused
	setTimeout(() => {
		if (!$eyasLayer) { return; }
		const isFocused = $eyasLayer.webContents.isFocused();

		// if the UI is not focused
		if (!isFocused) {
			// call the focus method again
			focusUI();
		} else {
			// reset the number of attempts
			focusUI.attempts = 0;
		}
	}, 250);
};

// Toggle the Eyas UI layer so the user can interact with it or their test
function toggleEyasUI(enable: IsActive): void {
	if (!$eyasLayer) { return; }

	if (enable) {
		// set the bounds to the current viewport
		$eyasLayer.setBounds({
			x: 0,
			y: 0,
			width: $currentViewport[0],
			height: $currentViewport[1]
		});

		// give the layer focus
		focusUI();
	} else {
		// close all modals in the UI
		$eyasLayer.webContents.send(`close-modals`);

		// shrink the bounds to 0 to hide it
		$eyasLayer.setBounds({ x: 0, y: 0, width: 0, height: 0 });
	}
}

// manage navigation
function navigate(path?: DomainUrl, openInBrowser?: IsActive): void {
	if (!$appWindow) { return; }

	// setup
	let runningTestSource = false;

	// if the path wasn't provided (default to local test source)
	if (!path) {
		// store that we're running the local test source
		runningTestSource = true;

		// if there's a custom domain, go there OR default to the local test source
		path = $testDomain;
	}

	if (
		// if requested to open in the browser AND
		openInBrowser &&
		(
			// not running the local test OR
			!runningTestSource ||
			// the test server is running AND we're running the local test
			(testServer.getTestServerState() && runningTestSource)
		)
	) {
		// open the requested url in the default browser
		shell.openExternal(path);
	} else {
		// otherwise load the requested path in the app window
		$appWindow.loadURL(path);
	}

	// ensure the UI is closed so the user can interact with the content
	toggleEyasUI(false);
}

// when the app resizes
function onResize(): void {
	if (!$appWindow || !$eyasLayer) { return; }

	// get the current viewport dimensions
	const [newWidth, newHeight] = $appWindow.getContentSize();

	// if the dimensions have not changed
	if (newWidth === $currentViewport[0] && newHeight === $currentViewport[1]) {
		return;
	}

	// update the current dimensions
	$currentViewport[0] = newWidth;
	$currentViewport[1] = newHeight;

	// get the $eyasLayer dimensions
	const { width, height } = $eyasLayer.getBounds();

	// if the Eyas UI layer is visible
	if (width && height) {
		// update the Eyas UI layer to match the new dimensions
		$eyasLayer.setBounds({ x: 0, y: 0, width: newWidth, height: newHeight });
	}

	// update the menu
	setMenu();
}

async function stopTestServer(): Promise<void> {
	await testServerService.stop(getCoreContext());
}

function copyTestServerUrlHandler(): void {
	testServerService.copyUrl(getCoreContext());
}

function openTestServerInBrowserHandler(_event?: unknown, url?: DomainUrl): void {
	testServerService.openInBrowser(getCoreContext(), url);
}

function resetTestServerSettings(): void {
	testServerService.resetSettings(getCoreContext());
}

async function startTestServerHandler(): Promise<void> {
	await testServerService.showSetupModal(getCoreContext());
}

async function doStartTestServer(autoOpenBrowser = true, customDomain: DomainUrl | null = null): Promise<void> {
	await testServerService.start(getCoreContext(), autoOpenBrowser, customDomain);
}

// whenever the test server automatically shuts down
function onTestServerTimeout(): void {
	testServerService.onTimeout(getCoreContext());
}

/**
 * Builds the list of viewport menu items based on the current configuration and viewport.
 * @returns An array of menu item objects for the viewport submenu.
 */
/**
 * Builds the list of viewport menu items based on the current configuration and viewport.
 * @param appWindow The app window to resize.
 * @param allViewports The list of available viewports.
 * @param currentViewport The current viewport dimensions [width, height].
 * @returns An array of menu item objects for the viewport submenu.
 */
export function getViewportMenuItems(
	appWindow: BrowserWindow | null,
	allViewports: Viewport[],
	currentViewport: ViewportSize
): MenuTemplate {
	if (!appWindow) { return []; }

	const tolerance = 2;
	const viewportItems: MenuTemplate = [];
	let defaultsFound = false;

	allViewports.forEach(res => {
		const [width, height] = currentViewport || [];
		const isSizeMatch = Math.abs(res.width - width) <= tolerance && Math.abs(res.height - height) <= tolerance;
		if (!defaultsFound && res.isDefault) {
			viewportItems.push({ type: `separator` });
			defaultsFound = true;
		}
		viewportItems.push({
			label: `${isSizeMatch ? `🔘 ` : ``}${res.label} (${res.width} x ${res.height})`,
			click: () => appWindow?.setContentSize(res.width, res.height)
		});
	});

	if (currentViewport.length === 2 && !allViewports.some(res => Math.abs(res.width - currentViewport[0]) <= tolerance && Math.abs(res.height - currentViewport[1]) <= tolerance)) {
		viewportItems.unshift(
			{ label: `🔘 Current (${currentViewport[0]} x ${currentViewport[1]})`, click: () => appWindow?.setContentSize(currentViewport[0], currentViewport[1]) },
			{ type: `separator` }
		);
	}

	return viewportItems;
}

/**
 * Builds the list of link menu items from the configuration.
 * @returns An array of menu item objects for the links submenu.
 */
/**
 * Builds the list of link menu items from the configuration.
 * @param config The validated configuration.
 * @param handlers Handlers for navigation.
 * @returns An array of menu item objects for the links submenu.
 */
export function getLinkMenuItems(
	config: ValidatedConfig | null,
	handlers: LinkMenuHandlers
): MenuTemplate {
	if (!config) { return []; }

	const linkItems: MenuTemplate = [];
	config.links.forEach((item: LinkConfig) => {
		const itemUrl = item.url;
		let isValid;
		let validUrl: string | undefined;
		const hasVariables = itemUrl.match(/{[^{}]+}/g)?.length;
		if (hasVariables) {
			isValid = isVariableLinkValid(itemUrl);
		} else {
			validUrl = parseURL(itemUrl)?.toString();
			isValid = !!validUrl;
		}
		linkItems.push({
			label: `${item.external ? `🌐 ` : ``}${item.label || item.url}${isValid ? `` : ` (invalid entry: "${item.url}")`}`,
			click: () => hasVariables ? handlers.navigateVariable(itemUrl) : handlers.navigate(validUrl, item.external),
			enabled: isValid
		});
	});

	return linkItems;
}

/**
 * Assembles the menu context object required for building the application menu template.
 * @param params Data required to build the context.
 * @returns The fully assembled MenuContext object.
 */
function getMenuContext(params: MenuContextParams): MenuContext {
	const { sessionAge, cacheSize, viewportItems, linkItems } = params;

	return {
		appName: APP_NAME,
		isDev: $isDev,
		testNetworkEnabled: $testNetworkEnabled,
		sessionAge,
		cacheSize,
		showAbout,
		quit: _electronCore.quit,
		startAFreshTest: () => startAFreshTest(true),
		copyUrl,
		openUiDevTools: (): void => $eyasLayer?.webContents.openDevTools(),
		navigateHome,
		reload,
		back,
		forward,
		toggleNetwork,
		clearCache: (): void => { clearCache(); },
		openCacheFolder,
		refreshMenu: setMenu,
		viewportItems,
		linkItems,
		updateStatus: ($updateStatus as `idle` | `downloading` | `downloaded`) || `idle`,
		onCheckForUpdates: $onCheckForUpdates,
		onInstallUpdate: $onInstallUpdate,
		testServerActive: !!testServer.getTestServerState(),
		testServerRemainingTime: getTestServerRemainingTime(),
		onStartTestServer: startTestServerHandler,
		onStopTestServer: stopTestServer,
		onCopyTestServerUrl: copyTestServerUrlHandler,
		onOpenTestServerInBrowser: openTestServerInBrowserHandler,
		testServerHttpsEnabled: $testServerHttpsEnabled,
		onToggleTestServerHttps,
		toggleTestDevTools: (): void => { $appWindow?.webContents.toggleDevTools(); },
		isInitializing: $isInitializing,
		isConfigLoaded: !!$config?.meta?.isConfigLoaded,
		isEnvironmentPending: $isEnvironmentPending,
		onOpenSettings,
		onShowWhatsNew: (): void => uiEvent(`show-whats-new`, true)
	};
}

/**
 * Calculates the remaining time for the test server session.
 * @returns A formatted duration string.
 */
export function getTestServerRemainingTime(): FormattedDuration {
	return testServerService.getRemainingTime();
}

/**
 * Copies the current app window URL to the clipboard.
 */
function copyUrl(): void {
	if ($isInitializing || !$appWindow) return;
	clipboard.writeText($appWindow.webContents.getURL());
}

/**
 * Navigates to the test home path.
 */
function navigateHome(): void {
	if ($isInitializing) return;
	navigate();
}

/**
 * Reloads the app window ignoring cache.
 */
function reload(): void {
	if ($isInitializing || !$appWindow) return;
	$appWindow.webContents.reloadIgnoringCache();
}

/**
 * Navigates back in the app window history.
 */
function back(): void {
	if ($isInitializing || !$appWindow) return;
	$appWindow.webContents.goBack();
}

/**
 * Navigates forward in the app window history.
 */
function forward(): void {
	if ($isInitializing || !$appWindow) return;
	$appWindow.webContents.goForward();
}

/**
 * Toggles the network enabled state and refreshes the menu.
 */
function toggleNetwork(): void {
	if ($isInitializing) return;
	$testNetworkEnabled = !$testNetworkEnabled;
	setMenu();
}

/**
 * Opens the storage path for the current session.
 */
function openCacheFolder(): void {
	if (!$appWindow) { return; }
	const storagePath = $appWindow.webContents.session.getStoragePath();
	if (storagePath) {
		shell.openPath(storagePath);
	}
}

/**
 * Toggles the HTTPS enabled state for the test server and refreshes the menu.
 */
function onToggleTestServerHttps(): void {
	testServerService.toggleHttps(getCoreContext());
}

/**
 * Shows the settings modal with current project and app settings.
 */
function onOpenSettings(): void {
	uiEvent(`show-settings-modal`, {
		project: settingsService.getProjectSettings($config?.meta?.projectId ?? undefined),
		app: settingsService.getAppSettings(),
		projectId: $config?.meta?.projectId || undefined
	});
}

/**
 * Displays the application About dialog.
 */
function showAbout(): void {
	if (!$config) { return; }
	const now = new Date();
	const expires = new Date($config.meta.expires);
	const dayCount = differenceInDays(expires, now);
	const expirationFormatted = format(expires, `MMM do @ p`);
	const relativeFormatted = dayCount ? `~${dayCount} days` : `soon`;
	const startYear = 2023;
	const currentYear = now.getFullYear();
	const yearRange = startYear === currentYear ? startYear.toString() : `${startYear} - ${currentYear}`;
	if ($appWindow) {
		dialog.showMessageBox($appWindow, {
			type: `info`,
			buttons: [`OK`],
			title: `About`,
			icon: $paths.icon as string,
			message: `
Name: ${$config.title}
Version: ${$config.version}
Expires: ${expirationFormatted} (${relativeFormatted})

Branch: ${$config.meta.gitBranch} #${$config.meta.gitHash}
User: ${$config.meta.gitUser}
Created: ${new Date($config.meta.compiled).toLocaleString()}
CLI: v${$config.meta.eyas}

Runner: v${_appVersion}

🏢 © ${yearRange} Cycosoft, LLC
🌐 https://cycosoft.com
🆘 https://github.com/cycosoft/Eyas/issues
`
		});
	}
}

// Set up the application menu
async function setMenu(): Promise<void> {
	if (!$appWindow || !$config) { return; }

	const sessionAge = getSessionAge();
	let cacheSize = 0;
	try {
		cacheSize = await $appWindow.webContents.session.getCacheSize();
	} catch {
		// ignore
	}

	const viewportItems = getViewportMenuItems($appWindow, $allViewports, $currentViewport);
	const linkItems = getLinkMenuItems($config, { navigate, navigateVariable });

	const context = getMenuContext({
		sessionAge,
		cacheSize,
		viewportItems,
		linkItems
	});

	const template = buildMenuTemplate(context);
	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setupAutoUpdater(): void {
	autoUpdater.forceDevUpdateConfig = true;
	// Spoof the current version for update testing (currentVersion is read-only)
	Object.defineProperty(autoUpdater, `currentVersion`, {
		get: () => semver.parse(_appVersion)
	});

	// Silence internal logging to prevent duplicate stack traces
	autoUpdater.logger = null;

	autoUpdater.setFeedURL({
		provider: `github`,
		owner: `cycosoft`,
		repo: `Eyas`
	});

	$onCheckForUpdates = (): void => {
		$updateCheckUserTriggered = true;
		autoUpdater.checkForUpdates().catch(() => { });
	};
	$onInstallUpdate = (): void => { autoUpdater.quitAndInstall(); };

	autoUpdater.on(`update-available`, () => {
		$updateStatus = `downloading`;
		setMenu();
	});
	autoUpdater.on(`update-downloaded`, () => {
		$updateStatus = `downloaded`;
		setMenu();
	});
	const showNoUpdateIfUserTriggered = (): void => {
		if ($updateCheckUserTriggered) {
			$updateCheckUserTriggered = false;
			if ($appWindow) {
				dialog.showMessageBox($appWindow, getNoUpdateAvailableDialogOptions());
			}
		}
	};
	autoUpdater.on(`update-not-available`, showNoUpdateIfUserTriggered);
	autoUpdater.on(`error`, (err: Error) => {
		if (err.message?.includes(`404`)) {
			console.error(`Auto-update error: update server not found`);
		} else {
			console.error(`Auto-update error:`, err);
		}
		showNoUpdateIfUserTriggered();
	});

	autoUpdater.checkForUpdates().catch(() => { });
}

function getSessionAge(): FormattedDuration {
	if (!$appWindow) { return ``; }

	let output: Date | string = new Date();

	// get the path to the cache
	const cachePath = $appWindow.webContents.session.getStoragePath();

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
}

// listen for the window to close
function manageAppClose(evt: PreventableEvent): void {
	// stop the window from closing
	evt.preventDefault();

	// send a message to the UI to show the exit modal with the captured image
	uiEvent(`modal-exit-visible`, true);

	// track that the modal background content was viewed
	trackEvent(MP_EVENTS.ui.modalBackgroundContentViewed);
}

// navigate to a variable url
function navigateVariable(url: DomainUrl): void {
	const env = { url: $testDomainRaw || ``, key: $envKey };

	// substitute all Eyas-managed env variables (_env.url, _env.key, testdomain)
	const output = substituteEnvVariables(url, env);

	// if substitution returned null, the env url is required but not yet set
	if (output === null) {
		if (!$appWindow) { return; }

		// alert the user that they need to select an environment first
		dialog.showMessageBoxSync($appWindow, {
			type: `warning`,
			buttons: [`OK`],
			title: `Select an Environment`,
			message: `You must select an environment before you can use this link`
		});

		return;
	}

	// if the url still has user-input variables
	if (hasRemainingVariables(output)) {
		// send request to the UI layer
		uiEvent(`show-variables-modal`, output);
	} else {
		// just pass through to navigate
		navigate(parseURL(output)?.toString());
	}
}


// clears the test cache
function clearCache(): void {
	if (!$appWindow) { return; }

	// clear all caches for the session
	$appWindow.webContents.session.clearCache(); // web cache
	$appWindow.webContents.session.clearStorageData(); // cookies, filesystem, indexed db, local storage, shader cache, web sql, service workers, cache storage

	// update the menu to reflect the cache changes
	setMenu();
}

// refresh the app
/**
 * Resets the test state including server and initialization flags.
 */
async function resetFreshTestState(): Promise<void> {
	// stop test server when test changes
	if (testServer.getTestServerState()) {
		await stopTestServer();
	}

	// clear the cached port for the test server
	testServer.clearTestServerPort();

	// reset initialization state
	$isInitializing = true;

	// Reset test server settings
	resetTestServerSettings();
}

/**
 * Initializes the viewports based on the configuration and defaults.
 */
function initFreshTestViewports(): void {
	// set the available viewports
	$allViewports = [...($config?.viewports || []), ...$defaultViewports];

	// reset the current viewport to the first in the list
	$currentViewport[0] = $allViewports[0].width;
	$currentViewport[1] = $allViewports[0].height;
	$appWindow?.setContentSize($currentViewport[0], $currentViewport[1]);
}

/**
 * Sets up the source path and domain information for the test.
 */
function setupFreshTestSource(): void {
	// reset the path to the test source
	$paths.testSrc = $config?.source || ``;

	// check if $config.source is a url
	const sourceOnWeb = parseURL($config?.source || ``);
	if (sourceOnWeb) {
		$testDomainRaw = $config?.source || ``;
		$testDomain = sourceOnWeb.toString();
		$envKey = null; // source URLs have no key
	}
}

/**
 * Handles navigation logic for no domains or a single domain.
 * @returns {boolean} True if navigation was handled.
 */
function handleSimpleDomainNavigation(): IsActive {
	// if there are no custom domains defined
	if (!$config?.domains.length) {
		console.log(`No domains defined, navigating...`);
		// load the test using the default domain
		navigate();
		return true;
	}

	// if the user has a single custom domain
	if ($config?.domains.length === 1) {
		console.log(`Single domain defined, navigating...`);
		// update the default domain and env key
		const parsed = parseURL($testDomainRaw);
		$testDomain = (parsed instanceof URL ? parsed.toString() : $testDomain);
		$envKey = $config.domains[0].key ?? null;

		// directly load the user's test using the new default domain
		navigate();
		return true;
	}

	return false;
}

/**
 * Handles navigation logic for multiple custom domains.
 * @param {boolean} forceShow - Whether to force show the environment modal.
 */
function handleMultiDomainNavigation(forceShow: IsActive): void {
	if (!$config || $config.domains.length <= 1) { return; }

	const currentHash = hashDomains($config.domains);
	const envSettings = settingsService.get(`env`, $config.meta.projectId ?? undefined) as EnvironmentSettings | undefined;
	const alwaysChoose = envSettings?.alwaysChoose;
	const lastChoice = envSettings?.lastChoice;
	const lastHash = envSettings?.lastChoiceHash;

	// skip the modal if the user opted out AND the domain list hasn't changed AND it's not a forced show
	if (!forceShow && alwaysChoose && lastChoice && lastHash === currentHash) {
		// auto-select the previously chosen environment
		$testDomainRaw = lastChoice.url;
		const parsed = parseURL(lastChoice.url);
		$testDomain = (parsed instanceof URL ? parsed.toString() : $testDomain);
		$envKey = lastChoice.key ?? null;
		navigate();
	} else {
		// display the environment chooser modal
		$isEnvironmentPending = true;
		uiEvent(`show-environment-modal`, $config.domains, {
			projectId: $config.meta.projectId ?? undefined,
			alwaysChoose: !!alwaysChoose,
			domainsHash: currentHash,
			forceShow
		});
		setMenu();
	}
}

/**
 * Checks for a version mismatch between the runner and the test builder.
 */
function checkVersionMismatch(): void {
	// if the runner is older than the version that built the test
	if ($config?.meta.eyas && semver.lt(_appVersion, $config.meta.eyas)) {
		// send request to the UI layer
		uiEvent(`show-version-mismatch-modal`, _appVersion, $config.meta.eyas);
	}
}

// refresh the app
async function startAFreshTest(forceShow = false): Promise<void> {
	await resetFreshTestState();
	initFreshTestViewports();
	setMenu();
	setupFreshTestSource();

	if (!handleSimpleDomainNavigation()) {
		handleMultiDomainNavigation(forceShow);
	}

	checkVersionMismatch();
}


/**
 * Check if the user needs to see the "What's New" modal on startup.
 */
function checkStartupSequence(): void {
	if (isWhatsNewRequired()) {
		// request to show the "What's New" modal
		uiEvent(`show-whats-new`);
	} else {
		// if the modal is not needed, release any other modal that might have been buffered
		triggerBufferedModal();
	}
}

/**
 * Single source of truth for whether the "What's New" modal is required.
 */
function isWhatsNewRequired(): IsActive {
	// check if the user has requested to skip the "What's New" modal
	if (process.argv.includes(`--skip-whats-new`)) {
		return false;
	}

	const appSettings = settingsService.getAppSettings() as AppSettings | undefined;
	const lastSeenVersion = appSettings?.lastSeenVersion || `0.0.0`;
	return !!($latestChangelogVersion && ($latestChangelogVersion !== lastSeenVersion));
}

/**
 * Trigger any modal that was buffered during the startup sequence.
 */
function triggerBufferedModal(): void {
	if (!$pendingStartupModal) { return; }

	// trigger the buffered modal event
	const { eventName, args } = $pendingStartupModal;
	$pendingStartupModal = null;
	uiEvent(eventName, ...args);
}

// request the UI layer to launch an event
function uiEvent(eventName: ChannelName, ...args: unknown[]): void {
	// if the "What's New" modal is currently active, buffer this event
	// (Except for the "What's New" modal itself)
	if ($pendingStartupModal === null && eventName !== `show-whats-new`) {
		// if we haven't seen the current version, buffer the first modal request
		if (isWhatsNewRequired()) {
			$pendingStartupModal = { eventName, args };
			return;
		}
	}

	// display the UI layer
	toggleEyasUI(true);

	// send the interaction to the UI layer
	$eyasLayer?.webContents.send(eventName, ...args);
}
