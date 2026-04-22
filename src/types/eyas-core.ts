import type { BrowserWindow, BrowserView } from 'electron';
import type { ValidatedConfig } from './config.js';
import type { TestServerOptions } from './test-server.js';
import type { IsActive, IsPending, DomainUrl, MPEventName, ChannelName, TimestampMS, AppVersion, EnvironmentKey, AppTitle, FormattedDuration, RetryCount, UpdateStatus } from './primitives.js';
import type { PreventableEvent, Viewport, ViewportSize, StartupModal } from './core.js';
import type { FilePath } from './primitives.js';

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
	$eyasLayer: BrowserView | null;
	$config: ValidatedConfig | null;
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

	// Functions
	toggleEyasUI: (enable: IsActive) => void;
	trackEvent: (event: MPEventName, extraData?: Record<string, unknown>) => Promise<void>;
	stopTestServer: () => Promise<void>;
	startAFreshTest: (forceShow?: IsActive) => Promise<void>;
	checkStartupSequence: () => void;
	navigate: (path?: DomainUrl, openInBrowser?: IsActive) => void;
	navigateVariable: (url: DomainUrl) => void;
	setMenu: () => Promise<void>;
	doStartTestServer: (autoOpenBrowser?: IsActive, customDomain?: DomainUrl | null) => Promise<void>;
	openTestServerInBrowserHandler: (_event?: unknown, url?: DomainUrl) => void;
	uiEvent: (eventName: ChannelName, ...args: unknown[]) => void;
	onTestServerTimeout: () => void;
	onToggleTestServerHttps: () => void;
	onOpenSettings: () => void;
	onTitleUpdate: (evt: PreventableEvent, title: AppTitle) => void;
	triggerBufferedModal: () => void;
	manageAppClose: (evt: PreventableEvent) => void;
	showAbout: () => void;
	clearCache: () => void;
	getSessionAge: () => FormattedDuration;

	// Services
	updateService: UpdateService;
};

/** Update Service interface */
export type UpdateService = {
	init: (ctx: CoreContext) => void;
	checkForUpdates: () => void;
	installUpdate: () => void;
	getStatus: () => UpdateStatus;
	reset: () => void;
};

/** UI Service interface */
export type UIService = {
	toggleEyasUI: (ctx: CoreContext, enable: IsActive) => void;
	focusUI: (ctx: CoreContext) => void;
	uiEvent: (ctx: CoreContext, eventName: ChannelName, ...args: unknown[]) => void;
	triggerBufferedModal: (ctx: CoreContext) => void;
	checkStartupSequence: (ctx: CoreContext) => void;
	isWhatsNewRequired: (ctx: CoreContext) => IsActive;
	focusAttempts: RetryCount;
};

/** App Service interface */
export type AppService = {
	showAbout: (ctx: CoreContext) => void;
	clearCache: (ctx: CoreContext) => void;
	getSessionAge: (ctx: CoreContext) => FormattedDuration;
	manageAppClose: (ctx: CoreContext, evt: PreventableEvent) => void;
	onTestServerTimeout: (ctx: CoreContext) => void;
};
