/** Context required to build the application menu */
export interface MenuContext {
	appName: string;
	isDev: boolean;
	testNetworkEnabled: boolean;
	sessionAge: string;
	cacheSize: string | number;
	showAbout: () => void;
	onOpenSettings?: () => void;
	onShowWhatsNew?: () => void;
	quit: () => void;
	startAFreshTest: () => void;
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
	viewportItems: Record<string, unknown>[];
	linkItems: Record<string, unknown>[];
	updateStatus?: string;
	onCheckForUpdates: () => void;
	onInstallUpdate: () => void;
	testServerActive?: boolean;
	onStartTestServer: () => void;
	toggleTestDevTools: () => void;
	isInitializing?: boolean;
	isConfigLoaded?: boolean;
	isEnvironmentPending?: boolean;
}
