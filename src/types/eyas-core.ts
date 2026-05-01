import type { BrowserWindow, WebContentsView } from 'electron';
import type { ValidatedConfig } from './config.js';
import type { TestServerOptions } from './test-server.js';
import type { IsActive, IsPending, DomainUrl, MPEventName, ChannelName, TimestampMS, AppVersion, EnvironmentKey, AppTitle, FormattedDuration, RetryCount, UpdateStatus, MetadataRecord } from './primitives.js';
import type { PreventableEvent, Viewport, ViewportSize, StartupModal, ConfigToLoad } from './core.js';
import type { FilePath } from './primitives.js';
import type { MenuTemplate, LinkMenuHandlers, MenuContextParams, MenuContext } from './menu.js';

/** Paths used by the Eyas core orchestrator */
export type EyasPaths = {
	icon: FilePath;
	configLoader: FilePath;
	packageJson: FilePath;
	testPreload: FilePath;
	eventBridge: FilePath;
	constants: FilePath;
	pathUtils: FilePath;
	timeUtils: FilePath;
	testSrc: FilePath | null;
	uiSource: FilePath;
	eyasInterface: FilePath;
	splashScreen: FilePath;
};

/** Context object for the Eyas core orchestrator to be shared with sub-modules */
export type CoreContext = {
	// State
	$appWindow: BrowserWindow | null;
	$eyasLayer: WebContentsView | null;
	$testLayer: WebContentsView | null;
	$config: ValidatedConfig | null;
	$configToLoad: ConfigToLoad;
	$testNetworkEnabled: IsActive;
	$testServerHttpsEnabled: IsActive;
	$lastTestServerOptions: TestServerOptions | null;
	$testDomainRaw: DomainUrl | null;
	$testDomain: DomainUrl;
	$envKey: EnvironmentKey | null;
	$isEnvironmentPending: IsPending;
	$testServerEndTime: TimestampMS | null;
	$latestChangelogVersion: AppVersion | null;
	$isStartupSequenceChecked: IsActive;
	$isInitializing: IsActive;
	$allViewports: Viewport[];
	$currentViewport: ViewportSize;
	$defaultViewports: Viewport[];
	$paths: EyasPaths;
	_appVersion: AppVersion;
	$pendingStartupModal: StartupModal | null;
	$isDev: IsActive;
	$shouldClearHistory: IsActive;

	// Setters (to avoid direct mutation if possible, but keep simple for now)
	setTestNetworkEnabled: (enabled: IsActive) => void;
	setTestServerHttpsEnabled: (enabled: IsActive) => void;
	setTestDomainRaw: (domain: DomainUrl | null) => void;
	setTestDomain: (domain: DomainUrl) => void;
	setEnvKey: (key: EnvironmentKey | null) => void;
	setIsEnvironmentPending: (pending: IsPending) => void;
	setLatestChangelogVersion: (version: AppVersion | null) => void;
	setIsStartupSequenceChecked: (checked: IsActive) => void;
	setTestServerEndTime: (time: TimestampMS | null) => void;
	setLastTestServerOptions: (options: TestServerOptions | null) => void;
	setIsInitializing: (initializing: IsActive) => void;
	setAllViewports: (viewports: Viewport[]) => void;
	setPendingStartupModal: (modal: StartupModal | null) => void;
	setAppWindow: (window: BrowserWindow | null) => void;
	setEyasLayer: (layer: WebContentsView | null) => void;
	setTestLayer: (layer: WebContentsView | null) => void;
	setConfigToLoad: (config: ConfigToLoad) => void;
	setConfig: (config: ValidatedConfig) => void;
	setShouldClearHistory: (clear: IsActive) => void;

	// Functions
	toggleEyasUI: (enable: IsActive, forceImmediate?: IsActive) => void;
	trackEvent: (event: MPEventName, extraData?: Record<string, unknown>) => Promise<void>;
	stopTestServer: () => Promise<void>;
	startAFreshTest: (forceShow?: IsActive) => Promise<void>;
	checkStartupSequence: () => void;
	navigate: (path?: DomainUrl, openInBrowser?: IsActive, closeUi?: IsActive) => void;
	navigateVariable: (url: DomainUrl) => void;
	setMenu: () => Promise<void>;
	doStartTestServer: (autoOpenBrowser?: IsActive, customDomain?: DomainUrl | null) => Promise<void>;
	openTestServerInBrowserHandler: (_event?: unknown, url?: DomainUrl) => void;
	showTestServerSetup: () => Promise<void>;
	uiEvent: (eventName: ChannelName, ...args: unknown[]) => void;
	onTestServerTimeout: () => void;
	onToggleTestServerHttps: () => void;
	onOpenSettings: () => void;
	onTitleUpdate: (evt: PreventableEvent, title: AppTitle) => void;
	triggerBufferedModal: () => void;
	manageAppClose: (evt: PreventableEvent) => void;
	requestExit: () => void;
	showAbout: () => void;
	clearCache: () => void;
	getSessionAge: () => FormattedDuration;
	getAppTitle: (title?: AppTitle) => AppTitle;
	setupWebRequestInterception: () => void;
	checkExpiration: () => void;
	goBack: () => void;
	goForward: () => void;
	reload: () => void;
	updateNavigationState: () => void;
	initIpcHandlers: () => void;

	// Services
	updateService: UpdateService;
	menuService: MenuService;
	windowService: WindowService;
};

/** Window Service interface */
export type WindowService = {
	createAppWindow: (ctx: CoreContext) => void;
	createSplashScreen: (ctx: CoreContext) => BrowserWindow;
	initEyasLayer: (ctx: CoreContext, splashScreen: BrowserWindow, splashVisible: TimestampMS) => void;
	initWindowListeners: (ctx: CoreContext) => void;
	handleResize: (ctx: CoreContext) => void;
	initElectronUi: (ctx: CoreContext) => Promise<void>;
};

/** Update Service interface */
export type UpdateService = {
	init: (ctx: CoreContext) => void;
	checkForUpdates: () => void;
	installUpdate: () => void;
	getStatus: () => UpdateStatus;
	reset: () => void;
};

/** Menu Service interface */
export type MenuService = {
	refresh: (ctx: CoreContext) => Promise<void>;
	getViewportMenuItems: (ctx: CoreContext) => MenuTemplate;
	getLinkMenuItems: (config: ValidatedConfig | null, handlers: LinkMenuHandlers) => MenuTemplate;
	getContext: (ctx: CoreContext, params: MenuContextParams) => MenuContext;
	getAppHandlers: (ctx: CoreContext) => Partial<MenuContext>;
	getNavigationHandlers: (ctx: CoreContext) => Partial<MenuContext>;
	getTestServerHandlers: (ctx: CoreContext) => Partial<MenuContext>;
};

/** UI Service interface */
export type UIService = {
	toggleEyasUI: (ctx: CoreContext, enable: IsActive, forceImmediate?: IsActive) => void;
	focusUI: (ctx: CoreContext) => void;
	uiEvent: (ctx: CoreContext, eventName: ChannelName, ...args: unknown[]) => void;
	triggerBufferedModal: (ctx: CoreContext) => void;
	checkStartupSequence: (ctx: CoreContext) => void;
	isWhatsNewRequired: (ctx: CoreContext) => IsActive;
	showSettings: (ctx: CoreContext) => void;
	focusAttempts: RetryCount;
};

/** App Service interface */
export type AppService = {
	showAbout: (ctx: CoreContext) => void;
	clearCache: (ctx: CoreContext) => void;
	getSessionAge: (ctx: CoreContext) => FormattedDuration;
	manageAppClose: (ctx: CoreContext, evt: PreventableEvent) => void;
	onTestServerTimeout: (ctx: CoreContext) => void;
	requestExit: () => void;
	init: (ctx: CoreContext) => Promise<void>;
	setupProtocols: (ctx: CoreContext) => void;
	handleReady: (ctx: CoreContext) => Promise<void>;
	checkExpiration: (ctx: CoreContext) => void;
	trackEvent: (ctx: CoreContext, event: MPEventName, extraData?: MetadataRecord) => Promise<void>;
};
