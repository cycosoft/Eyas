import type {
	WebContentsView
} from 'electron';
import {
	app,
	BrowserWindow,
	nativeTheme
} from 'electron';
import _path from 'node:path';

// only allow a single instance of the app to be at a time
const _electronCore = app;
const isPrimaryInstance = _electronCore.requestSingleInstanceLock();
if (!isPrimaryInstance) {
	console.log(``);
	console.log(`Another instance of the app is already running. Exiting.`);
	console.log(``);

	_electronCore.quit();
}

// Internal modules
import $roots from '@scripts/get-roots.js';
import { testServerService } from './test-server.service.js';
import { navigationService } from './navigation.service.js';
import { uiService } from './ui.service.js';
import { appService } from './app.service.js';
import * as settingsService from './settings-service.js';
import { updateService } from './update.service.js';
import { menuService } from './menu.service.js';
import { windowService } from './window.service.js';

import { initIpcHandlers } from './ipc-handlers.js';
import {
	registerInternalProtocols,
	setupWebRequestInterception
} from './protocol-handlers.js';
import type { CoreContext, EyasPaths } from '@registry/eyas-core.js';

// Types
import type { ValidatedConfig } from '@registry/config.js';
import type { TestServerOptions } from '@registry/test-server.js';
import type { Viewport, ConfigToLoad, StartupModal, PreventableEvent, ViewportSize } from '@registry/core.js';
import type { ViewportWidth, ViewportHeight, ViewportLabel, ChannelName, IsActive, IsPending, DomainUrl, FormattedDuration, MPEventName, TimestampMS, AppTitle, AppVersion, EnvironmentKey, MetadataRecord, SystemTheme } from '@registry/primitives.js';

// global variables $
const $isDev = process.argv.includes(`--dev`) as IsActive;
let $appWindow: BrowserWindow | null = null;
let $eyasLayer: WebContentsView | null = null;
let $testLayer: WebContentsView | null = null;
let $config: ValidatedConfig | null = null;
let $configToLoad: ConfigToLoad = {};
let $testNetworkEnabled: IsActive = true;
let $testServerHttpsEnabled: IsActive = false;
let $lastTestServerOptions: TestServerOptions | null = null;
let $testServerEndTime: TimestampMS | null = null;
let $testDomainRaw: DomainUrl | null = null;
let $testDomain = `eyas://local.test` as DomainUrl;
let $envKey: EnvironmentKey | null = null;
const $defaultViewports: Viewport[] = [
	{ isDefault: true, label: `Desktop` as ViewportLabel, width: 1366 as ViewportWidth, height: 768 as ViewportHeight },
	{ isDefault: true, label: `Tablet` as ViewportLabel, width: 768 as ViewportWidth, height: 1024 as ViewportHeight },
	{ isDefault: true, label: `Mobile` as ViewportLabel, width: 360 as ViewportWidth, height: 640 as ViewportHeight }
];
let $allViewports: Viewport[] = [];
const $currentViewport: ViewportSize = [0, 0];
let $latestChangelogVersion: AppVersion | null = null;
let $isInitializing: IsActive = true;
let $isEnvironmentPending: IsPending = false;
let $pendingStartupModal: StartupModal | null = null;
let $isStartupSequenceChecked: IsActive = false;

const $paths = {
	icon: _path.join($roots.eyas, `eyas-assets`, `eyas-logo.png`),
	configLoader: _path.join($roots.eyas, `scripts`, `get-config.js`),
	packageJson: _path.join($roots.eyas, `..`, `package.json`),
	testPreload: _path.join($roots.eyas, `scripts`, `test-preload.js`),
	eventBridge: _path.join($roots.eyas, `scripts`, `event-bridge.js`),
	constants: _path.join($roots.eyas, `scripts`, `constants.js`),
	pathUtils: _path.join($roots.eyas, `scripts`, `path-utils.js`),
	timeUtils: _path.join($roots.eyas, `scripts`, `time-utils.js`),
	testSrc: `` as DomainUrl | null,
	uiSource: _path.join($roots.eyas, `eyas-interface`),
	eyasInterface: _path.join($roots.eyas, `eyas-interface`, `index.html`),
	splashScreen: _path.join($roots.eyas, `eyas-interface`, `splash.html`)
};

// eslint-disable-next-line quotes
import _package from "@root/package.json" with { type: "json" };
const _appVersion = _package.version;




// ─── helpers ──────────────────────────────────────────────────────────────────

// OS Listener
nativeTheme.on(`updated`, () => {
	const currentSetting = settingsService.get(`theme`) as SystemTheme;
	if (currentSetting === `system`) {
		$eyasLayer?.webContents?.send(`system-theme-updated`, nativeTheme.shouldUseDarkColors ? `dark` : `light`);
	}
});

// start the core of the application
async function initElectronCore(): Promise<void> {
	await appService.init(getCoreContext());

	// add support for eyas:// protocol
	registerInternalProtocols();

	// start the electron layer
	app.whenReady().then(handleAppReady);
}

/**
 * Handles the application ready event.
 */
async function handleAppReady(): Promise<void> {
	await appService.handleReady(getCoreContext());

	// start the UI layer
	windowService.initElectronUi(getCoreContext());

	updateService.init(getCoreContext());

	// if Electron receives the `activate` event
	app.on(`activate`, () => {
		// if the window does not already exist, create it
		if (BrowserWindow.getAllWindows().length === 0) {
			windowService.initElectronUi(getCoreContext());
		}
	});
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
	setPendingStartupModal: (modal: StartupModal | null): void => { $pendingStartupModal = modal; },
	setAppWindow: (window: BrowserWindow | null): void => { $appWindow = window; },
	setEyasLayer: (layer: WebContentsView | null): void => { $eyasLayer = layer; },
	setTestLayer: (layer: WebContentsView | null): void => { $testLayer = layer; },
	setConfigToLoad: (config: ConfigToLoad): void => { $configToLoad = config; },
	setConfig: (config: ValidatedConfig): void => { $config = config; }
};

const coreContextFunctions = {
	toggleEyasUI: (enable: IsActive, forceImmediate?: IsActive): void => uiService.toggleEyasUI(getCoreContext(), enable, forceImmediate),
	trackEvent: (event: MPEventName, extraData?: MetadataRecord): Promise<void> => appService.trackEvent(getCoreContext(), event, extraData),
	stopTestServer: (): Promise<void> => testServerService.stop(getCoreContext()),
	startAFreshTest: (forceShow?: IsActive): Promise<void> => navigationService.startAFreshTest(getCoreContext(), forceShow),
	checkStartupSequence: (): void => uiService.checkStartupSequence(getCoreContext()),
	navigate: (path?: DomainUrl, openInBrowser?: IsActive, closeUi?: IsActive): void => navigationService.navigate(getCoreContext(), path, openInBrowser, closeUi),
	navigateVariable: (url: DomainUrl): void => navigationService.navigateVariable(getCoreContext(), url),
	setMenu: (): Promise<void> => menuService.refresh(getCoreContext()),
	doStartTestServer: (autoOpenBrowser?: IsActive, customDomain?: DomainUrl | null): Promise<void> => testServerService.start(getCoreContext(), autoOpenBrowser, customDomain),
	openTestServerInBrowserHandler: (_event?: unknown, url?: DomainUrl): void => testServerService.openInBrowser(getCoreContext(), url),
	showTestServerSetup: (): Promise<void> => testServerService.showSetupModal(getCoreContext()),
	uiEvent: (eventName: ChannelName, ...args: unknown[]): void => uiService.uiEvent(getCoreContext(), eventName, ...args),
	onTestServerTimeout: (): void => appService.onTestServerTimeout(getCoreContext()),
	onToggleTestServerHttps: (): void => testServerService.toggleHttps(getCoreContext()),
	onOpenSettings: (): void => uiService.showSettings(getCoreContext()),
	onTitleUpdate: (evt: PreventableEvent, title: AppTitle): void => navigationService.onTitleUpdate(getCoreContext(), evt, title),
	triggerBufferedModal: (): void => uiService.triggerBufferedModal(getCoreContext()),
	manageAppClose: (evt: PreventableEvent): void => appService.manageAppClose(getCoreContext(), evt),
	requestExit: (): void => appService.requestExit(),
	showAbout: (): void => appService.showAbout(getCoreContext()),
	clearCache: (): void => appService.clearCache(getCoreContext()),
	getSessionAge: (): FormattedDuration => appService.getSessionAge(getCoreContext()),
	getAppTitle: (title?: AppTitle): AppTitle => navigationService.getAppTitleWithContext(getCoreContext(), title),
	setupWebRequestInterception: (): void => setupWebRequestInterception(getCoreContext()),
	checkExpiration: (): void => appService.checkExpiration(getCoreContext()),
	goBack: (): void => navigationService.goBack(getCoreContext()),
	goForward: (): void => navigationService.goForward(getCoreContext()),
	reload: (): void => navigationService.reload(getCoreContext()),
	initIpcHandlers: (): void => initIpcHandlers(getCoreContext())
};

function getCoreContext(): CoreContext {
	if ($coreContext) { return $coreContext; }

	$coreContext = {
		get $appWindow(): BrowserWindow | null { return $appWindow; },
		get $eyasLayer(): WebContentsView | null { return $eyasLayer; },
		get $testLayer(): WebContentsView | null { return $testLayer; },
		get $config(): ValidatedConfig | null { return $config; },
		get $configToLoad(): ConfigToLoad { return $configToLoad; },
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
		get $isDev(): IsActive { return $isDev; },
		...coreContextSetters,
		...coreContextFunctions,
		updateService,
		menuService,
		windowService
	};

	return $coreContext as CoreContext;
}

// APP_ENTRY: must be AFTER all let/const declarations (avoids Temporal Dead Zone).
// getCoreContext() accesses $coreContext (declared with let), which would be in the
// TDZ if initElectronCore() were called before the declaration is evaluated.
initElectronCore().catch(err => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
	require(`fs`).writeFileSync(`crash.log`, String(err && err.stack ? err.stack : err));
	process.exit(1);
});
