import type { BrowserWindow, BrowserView } from 'electron';
import type { ValidatedConfig } from './config.js';
import type { TestServerOptions } from './test-server.js';
import type { IsActive, IsPending, DomainUrl, MPEventName, ChannelName, TimestampMS, AppVersion, EnvironmentKey } from './primitives.js';
import type { PreventableEvent } from './core.js';
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
	$paths: EyasPaths;
	_appVersion: AppVersion;

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

	// Functions
	toggleEyasUI: (enable: IsActive) => void;
	trackEvent: (event: MPEventName, extraData?: Record<string, unknown>) => Promise<void>;
	stopTestServer: () => Promise<void>;
	checkStartupSequence: () => void;
	navigate: (path?: DomainUrl, openInBrowser?: IsActive) => void;
	setMenu: () => Promise<void>;
	doStartTestServer: (autoOpenBrowser?: IsActive, customDomain?: DomainUrl | null) => Promise<void>;
	openTestServerInBrowserHandler: (_event?: unknown, url?: DomainUrl) => void;
	uiEvent: (eventName: ChannelName, ...args: unknown[]) => void;
	onTestServerTimeout: () => void;
	onToggleTestServerHttps: () => void;
	onOpenSettings: () => void;
	triggerBufferedModal: () => void;
	manageAppClose: (evt: PreventableEvent) => void;
};
