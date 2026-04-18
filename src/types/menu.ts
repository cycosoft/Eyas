import type { AppName, IsActive, FormattedDuration, ByteCount, UpdateStatus, MenuLabel, DomainUrl, MenuAccelerator } from './primitives.js';

/** A single menu item descriptor */
export type MenuItem = {
	label?: MenuLabel;
	type?: `normal` | `separator` | `submenu` | `checkbox` | `radio`;
	enabled?: IsActive;
	click?: () => void;
	submenu?: MenuItem[];
	accelerator?: MenuAccelerator;
	[key: string]: unknown; // Allow other Electron-specific props
}

/** A full menu template array */
export type MenuTemplate = MenuItem[];

/** Parameters for getMenuContext */
export type MenuContextParams = {
	sessionAge: FormattedDuration;
	cacheSize: ByteCount;
	viewportItems: MenuItem[];
	linkItems: MenuItem[];
}

/** Handlers for navigation links in the menu */
export type LinkMenuHandlers = {
	navigate: (url?: DomainUrl, external?: IsActive) => void;
	navigateVariable: (url: DomainUrl) => void;
}

/** Context required to build the application menu */
export type MenuContext = {
	appName: AppName;
	isDev: IsActive;
	testNetworkEnabled: IsActive;
	sessionAge: FormattedDuration;
	cacheSize: ByteCount | FormattedDuration;
	showAbout: () => void;
	onOpenSettings?: () => void;
	onShowWhatsNew?: () => void;
	quit: () => void;
	startAFreshTest: () => void | Promise<void>;
	copyUrl: () => void;
	openUiDevTools: () => void;
	navigateHome: () => void;
	reload: () => void;
	back: () => void;
	forward: () => void;
	toggleNetwork: () => void;
	clearCache: () => void;
	openCacheFolder: () => void;
	refreshMenu: () => void;
	viewportItems: MenuItem[];
	linkItems: MenuItem[];
	updateStatus?: UpdateStatus;
	onCheckForUpdates: () => void;
	onInstallUpdate: () => void;
	testServerActive?: IsActive;
	testServerRemainingTime?: FormattedDuration;
	onStartTestServer: () => void;
	onStopTestServer?: () => void | Promise<void>;
	onCopyTestServerUrl?: () => void;
	onOpenTestServerInBrowser?: (event?: unknown, url?: DomainUrl) => void;
	testServerHttpsEnabled?: IsActive;
	onToggleTestServerHttps?: () => void;
	toggleTestDevTools: () => void;
	isInitializing?: IsActive;
	isConfigLoaded?: IsActive;
	isEnvironmentPending?: IsActive;
}
