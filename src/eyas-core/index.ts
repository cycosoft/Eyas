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
import { isPast } from 'date-fns/isPast';
import { format } from 'date-fns/format';
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
import { navigationService } from './navigation.service.js';
import { uiService } from './ui.service.js';
import { appService } from './app.service.js';
import { isVariableLinkValid } from '@scripts/variable-utils.js';
import * as settingsService from './settings-service.js';
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
import type { Viewport, ConfigToLoad, StartupModal, PreventableEvent, ViewportSize } from '@registry/core.js';
import type { ViewportWidth, ViewportHeight, ViewportLabel, ChannelName, IsActive, IsPending, DomainUrl, FormattedDuration, MPEventName, TimestampMS, ThemeSource, AppTitle, AppVersion, EnvironmentKey } from '@registry/primitives.js';

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
		startAFreshTest: () => navigationService.startAFreshTest(getCoreContext()),
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
			navigationService.startAFreshTest(getCoreContext());
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
		title: navigationService.getAppTitleWithContext(getCoreContext()),
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
		await navigationService.startAFreshTest(getCoreContext());

		// check the startup sequence (What's New, etc.)
		getCoreContext().checkStartupSequence();

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
	// IMPORTANT: Must pass getCoreContext().manageAppClose (the stable singleton reference),
	// NOT an inline wrapper — ipc-handlers.ts removes it by the same reference.
	$appWindow.on(`close`, getCoreContext().manageAppClose);

	// listen for changes to the window size
	$appWindow.on(`resize`, onResize);

	// Whenever a title update is requested
	$appWindow.on(`page-title-updated`, (evt, title) => navigationService.onTitleUpdate(getCoreContext(), evt, title));

	// Whenever the content is loaded on the app window
	$appWindow.webContents.on(`did-finish-load`, () => {
		// update the title, preserving the current page title
		$appWindow?.setTitle(navigationService.getAppTitleWithContext(getCoreContext(), $appWindow.webContents.getTitle()));

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
			win.setTitle(navigationService.getAppTitleWithContext(getCoreContext(), title));
		});

		// Also apply our format when the new window finishes loading
		win.webContents.on(`did-finish-load`, () => {
			win.setTitle(navigationService.getAppTitleWithContext(getCoreContext(), win.webContents.getTitle()));
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
const coreContextSetters = {
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
	setAllViewports: (viewports: Viewport[]): void => { $allViewports = viewports; },
	setPendingStartupModal: (modal: StartupModal | null): void => { $pendingStartupModal = modal; }
};

const coreContextFunctions = {
	toggleEyasUI: (enable: IsActive): void => uiService.toggleEyasUI(getCoreContext(), enable),
	trackEvent: (event: MPEventName, extraData?: Record<string, unknown>): Promise<void> => trackEvent(event, extraData),
	stopTestServer: (): Promise<void> => stopTestServer(),
	startAFreshTest: (forceShow?: IsActive): Promise<void> => navigationService.startAFreshTest(getCoreContext(), forceShow),
	checkStartupSequence: (): void => uiService.checkStartupSequence(getCoreContext()),
	navigate: (path?: DomainUrl, openInBrowser?: IsActive): void => navigationService.navigate(getCoreContext(), path, openInBrowser),
	navigateVariable: (url: DomainUrl): void => navigationService.navigateVariable(getCoreContext(), url),
	setMenu: (): Promise<void> => setMenu(),
	doStartTestServer: (autoOpenBrowser?: IsActive, customDomain?: DomainUrl | null): Promise<void> => doStartTestServer(autoOpenBrowser, customDomain),
	openTestServerInBrowserHandler: (_event?: unknown, url?: DomainUrl): void => openTestServerInBrowserHandler(_event, url),
	uiEvent: (eventName: ChannelName, ...args: unknown[]): void => uiService.uiEvent(getCoreContext(), eventName, ...args),
	onTestServerTimeout: (): void => appService.onTestServerTimeout(getCoreContext()),
	onToggleTestServerHttps: (): void => testServerService.toggleHttps(getCoreContext()),
	onOpenSettings: (): void => onOpenSettings(),
	onTitleUpdate: (evt: PreventableEvent, title: AppTitle): void => navigationService.onTitleUpdate(getCoreContext(), evt, title),
	triggerBufferedModal: (): void => uiService.triggerBufferedModal(getCoreContext()),
	manageAppClose: (evt: PreventableEvent): void => appService.manageAppClose(getCoreContext(), evt),
	showAbout: (): void => appService.showAbout(getCoreContext()),
	clearCache: (): void => appService.clearCache(getCoreContext()),
	getSessionAge: (): FormattedDuration => appService.getSessionAge(getCoreContext())
};

function getCoreContext(): CoreContext {
	if ($coreContext) { return $coreContext; }

	$coreContext = {
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
		get $allViewports(): Viewport[] { return $allViewports; },
		get $currentViewport(): ViewportSize { return $currentViewport; },
		get $defaultViewports(): Viewport[] { return $defaultViewports; },
		get $paths(): EyasPaths { return $paths as EyasPaths; },
		get _appVersion(): AppVersion { return _appVersion as AppVersion; },
		get $pendingStartupModal(): StartupModal | null { return $pendingStartupModal; },
		...coreContextSetters,
		...coreContextFunctions
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



async function startTestServerHandler(): Promise<void> {
	await testServerService.showSetupModal(getCoreContext());
}

async function doStartTestServer(autoOpenBrowser = true, customDomain: DomainUrl | null = null): Promise<void> {
	await testServerService.start(getCoreContext(), autoOpenBrowser, customDomain);
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
		showAbout: () => getCoreContext().showAbout(),
		quit: _electronCore.quit,
		startAFreshTest: () => navigationService.startAFreshTest(getCoreContext(), true),
		copyUrl,
		openUiDevTools: (): void => $eyasLayer?.webContents.openDevTools(),
		navigateHome,
		reload,
		back,
		forward,
		toggleNetwork,
		clearCache: (): void => { getCoreContext().clearCache(); },
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
		onToggleTestServerHttps: () => getCoreContext().onToggleTestServerHttps(),
		toggleTestDevTools: (): void => { $appWindow?.webContents.toggleDevTools(); },
		isInitializing: $isInitializing,
		isConfigLoaded: !!$config?.meta?.isConfigLoaded,
		isEnvironmentPending: $isEnvironmentPending,
		onOpenSettings,
		onShowWhatsNew: (): void => getCoreContext().uiEvent(`show-whats-new`, true)
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
	navigationService.navigate(getCoreContext());
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
 * Shows the settings modal with current project and app settings.
 */
function onOpenSettings(): void {
	getCoreContext().uiEvent(`show-settings-modal`, {
		project: settingsService.getProjectSettings($config?.meta?.projectId ?? undefined),
		app: settingsService.getAppSettings(),
		projectId: $config?.meta?.projectId || undefined
	});
}



// Set up the application menu
async function setMenu(): Promise<void> {
	if (!$appWindow || !$config) { return; }

	const sessionAge = getCoreContext().getSessionAge();
	let cacheSize = 0;
	try {
		cacheSize = await $appWindow.webContents.session.getCacheSize();
	} catch {
		// ignore
	}

	const viewportItems = getViewportMenuItems($appWindow, $allViewports, $currentViewport);
	const linkItems = getLinkMenuItems($config, {
		navigate: (path?: DomainUrl, openInBrowser?: IsActive) => navigationService.navigate(getCoreContext(), path, openInBrowser),
		navigateVariable: (url: DomainUrl) => navigationService.navigateVariable(getCoreContext(), url)
	});

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
















