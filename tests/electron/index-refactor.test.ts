import { describe, test, expect, vi, beforeEach } from 'vitest';
import { app, BrowserWindow, ipcMain, session, protocol } from 'electron';
import type { EyasPaths } from '@registry/eyas-core.js';

type BrowserWindowConstructor = { new (): BrowserWindow };

// Mock electron before importing index.ts
vi.mock(`electron`, () => ({
	app: {
		requestSingleInstanceLock: vi.fn(() => true),
		quit: vi.fn(),
		on: vi.fn(),
		whenReady: vi.fn().mockResolvedValue(true),
		setAsDefaultProtocolClient: vi.fn(),
		getVersion: vi.fn().mockReturnValue(`1.0.0`),
		getName: vi.fn().mockReturnValue(`Eyas`),
		getAppPath: vi.fn().mockReturnValue(``),
		getPath: vi.fn().mockReturnValue(``)
	},
	BrowserWindow: vi.fn().mockImplementation(function() {
		return {
			webContents: {
				on: vi.fn(),
				loadURL: vi.fn(),
				getURL: vi.fn().mockReturnValue(`https://test.com`),
				getTitle: vi.fn().mockReturnValue(`Test Title`),
				session: {
					webRequest: {
						onBeforeRequest: vi.fn()
					}
				}
			},
			on: vi.fn(),
			loadURL: vi.fn(),
			addBrowserView: vi.fn(),
			contentView: {
				addChildView: vi.fn(),
				removeInterfaceView: vi.fn()
			},
			show: vi.fn(),
			setContentSize: vi.fn(),
			getContentSize: vi.fn().mockReturnValue([1366, 768]),
			setTitle: vi.fn(),
			removeListener: vi.fn()
		};
	}),
	WebContentsView: vi.fn().mockImplementation(function() {
		return {
			webContents: {
				on: vi.fn(),
				loadURL: vi.fn(),
				send: vi.fn(),
				focus: vi.fn(),
				isFocused: vi.fn().mockReturnValue(true)
			},
			setBounds: vi.fn(),
			getBounds: vi.fn().mockReturnValue({ width: 1366, height: 768 })
		};
	}),
	BrowserView: vi.fn().mockImplementation(function() {
		return {
			webContents: {
				on: vi.fn(),
				loadURL: vi.fn(),
				send: vi.fn(),
				focus: vi.fn(),
				isFocused: vi.fn().mockReturnValue(true)
			},
			setBounds: vi.fn(),
			getBounds: vi.fn().mockReturnValue({ width: 1366, height: 768 })
		};
	}),
	Menu: {
		setApplicationMenu: vi.fn(),
		buildFromTemplate: vi.fn()
	},
	ipcMain: {
		on: vi.fn(),
		handle: vi.fn(),
		removeListener: vi.fn()
	},
	nativeTheme: {
		on: vi.fn(),
		themeSource: `system`,
		shouldUseDarkColors: false
	},
	shell: {
		openExternal: vi.fn(),
		openPath: vi.fn()
	},
	clipboard: {
		writeText: vi.fn()
	},
	session: {
		fromPartition: vi.fn(() => ({
			protocol: {
				handle: vi.fn()
			}
		}))
	},
	protocol: {
		registerSchemesAsPrivileged: vi.fn()
	},
	dialog: {
		showMessageBox: vi.fn(),
		showMessageBoxSync: vi.fn()
	}
}));

// Mock other modules
vi.mock(`../../src/eyas-core/test-server/test-server.js`, () => ({
	getTestServerState: vi.fn(),
	stopTestServer: vi.fn(),
	clearTestServerPort: vi.fn(),
	doStartTestServer: vi.fn()
}));

vi.mock(`../../src/eyas-core/settings-service.js`, () => ({
	get: vi.fn(),
	getProjectSettings: vi.fn(),
	getAppSettings: vi.fn(),
	load: vi.fn().mockResolvedValue(undefined),
	save: vi.fn().mockResolvedValue(undefined)
}));

vi.mock(`../../src/eyas-core/deep-link-handler.js`, () => ({
	handleEyasProtocolUrl: vi.fn(),
	getEyasUrlFromCommandLine: vi.fn()
}));

vi.mock(`electron-updater`, () => {
	const mock = {
		autoUpdater: {
			forceDevUpdateConfig: false,
			logger: null,
			setFeedURL: vi.fn(),
			checkForUpdates: vi.fn().mockResolvedValue(null),
			on: vi.fn(),
			quitAndInstall: vi.fn(),
			currentVersion: { version: `1.0.0` }
		}
	};
	return {
		...mock,
		default: mock
	};
});

// Import the services to test
import { appService } from '@core/app.service.js';
import { windowService } from '@core/window.service.js';

import {
	setupWebRequestInterception,
	registerUiProtocolHandler,
	registerEyasProtocolHandler,
	registerHttpsProtocolHandler,
	registerInternalProtocols
} from '@core/protocol-handlers.js';

import {
	initIpcHandlers
} from '@core/ipc-handlers.js';
import type { CoreContext } from '@registry/eyas-core.js';

describe(`index.ts refactoring unit tests`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test(`setupProtocols should call setAsDefaultProtocolClient`, () => {
		const ctx = {} as unknown as CoreContext;
		appService.setupProtocols(ctx);
		expect(app.setAsDefaultProtocolClient).toHaveBeenCalledWith(`eyas`);
	});

	test(`createAppWindow should instantiate BrowserWindow`, () => {
		const ctx = {
			setAppWindow: vi.fn(),
			$config: { meta: { testId: `test` } },
			$currentViewport: [1366, 768],
			$paths: { icon: `test.png` },
			getAppTitle: vi.fn().mockReturnValue(`Test`)
		} as unknown as CoreContext;
		windowService.createAppWindow(ctx);
		expect(BrowserWindow).toHaveBeenCalled();
	});

	test(`handleResize should update viewport and bounds`, () => {
		const mockLayer = {
			getBounds: vi.fn().mockReturnValue({ width: 800, height: 600 }),
			setBounds: vi.fn()
		};
		const ctx = {
			$appWindow: { getContentSize: vi.fn().mockReturnValue([1024, 768]) },
			$eyasLayer: mockLayer,
			$currentViewport: [800, 600],
			setMenu: vi.fn()
		} as unknown as CoreContext;

		windowService.handleResize(ctx);

		expect(ctx.$currentViewport).toEqual([1024, 768]);
		expect(mockLayer.setBounds).toHaveBeenCalledWith({ x: 0, y: 0, width: 1024, height: 768 });
		expect(ctx.setMenu).toHaveBeenCalled();
	});

	test(`handleResize should ALWAYS update bounds even if current layer is 0x0`, () => {
		const mockLayer = {
			getBounds: vi.fn().mockReturnValue({ width: 0, height: 0 }),
			setBounds: vi.fn()
		};
		const ctx = {
			$appWindow: { getContentSize: vi.fn().mockReturnValue([1024, 768]) },
			$eyasLayer: mockLayer,
			$currentViewport: [800, 600],
			setMenu: vi.fn()
		} as unknown as CoreContext;

		windowService.handleResize(ctx);

		expect(mockLayer.setBounds).toHaveBeenCalledWith({ x: 0, y: 0, width: 1024, height: 48 }); // 48 is EYAS_HEADER_HEIGHT
	});

	test(`initElectronUi should orchestrate window startup`, async () => {
		const ctx = {
			$defaultViewports: [{ width: 1024, height: 768 }],
			$currentViewport: [0, 0],
			setupWebRequestInterception: vi.fn(),
			trackEvent: vi.fn(),
			checkExpiration: vi.fn(),
			initIpcHandlers: vi.fn(),
			$appWindow: { loadURL: vi.fn(), on: vi.fn(), webContents: { on: vi.fn() } },
			$config: { meta: { testId: `test` } },
			$paths: { testPreload: ``, eventBridge: `` },
			getAppTitle: vi.fn(),
			setAppWindow: vi.fn(),
			setEyasLayer: vi.fn()
		} as unknown as CoreContext;

		vi.spyOn(windowService, `createAppWindow`).mockImplementation(() => {});
		vi.spyOn(windowService, `createSplashScreen`).mockImplementation(() => ({
			webContents: { on: vi.fn(), loadURL: vi.fn() },
			center: vi.fn(),
			show: vi.fn()
		} as unknown as BrowserWindow));
		vi.spyOn(windowService, `initWindowListeners`).mockImplementation(() => {});
		vi.spyOn(windowService, `initEyasLayer`).mockImplementation(() => {});

		await windowService.initElectronUi(ctx);

		expect(ctx.$currentViewport).toEqual([1024, 768]);
		expect(windowService.createAppWindow).toHaveBeenCalledWith(ctx);
		expect(ctx.setupWebRequestInterception).toHaveBeenCalled();
		expect(ctx.trackEvent).toHaveBeenCalled();
		expect(ctx.checkExpiration).toHaveBeenCalled();
		expect(ctx.initIpcHandlers).toHaveBeenCalled();
		expect(windowService.initEyasLayer).toHaveBeenCalled();
	});

	test(`setupWebRequestInterception should register onBeforeRequest`, () => {
		const ctx = {
			$appWindow: new (BrowserWindow as unknown as BrowserWindowConstructor)()
		} as unknown as CoreContext;
		setupWebRequestInterception(ctx);
		expect(ctx.$appWindow?.webContents.session.webRequest.onBeforeRequest).toHaveBeenCalled();
	});

	test(`initIpcHandlers should register all IPC listeners`, () => {
		const ctx = {
			$appWindow: null,
			$eyasLayer: null,
			$config: null,
			$testNetworkEnabled: true,
			$testServerHttpsEnabled: false,
			$lastTestServerOptions: null,
			$testDomainRaw: null,
			$testDomain: ``,
			$envKey: null,
			$isEnvironmentPending: false,
			$testServerEndTime: null,
			$latestChangelogVersion: null,
			$isStartupSequenceChecked: false,
			$paths: {
				uiSource: ``,
				testSrc: ``
			} as unknown as EyasPaths,
			_appVersion: `1.0.0`,
			toggleEyasUI: vi.fn(),
			trackEvent: vi.fn(),
			stopTestServer: vi.fn(),
			checkStartupSequence: vi.fn(),
			navigate: vi.fn(),
			setMenu: vi.fn(),
			doStartTestServer: vi.fn(),
			openTestServerInBrowserHandler: vi.fn(),
			uiEvent: vi.fn(),
			onTestServerTimeout: vi.fn(),
			onToggleTestServerHttps: vi.fn(),
			onOpenSettings: vi.fn(),
			triggerBufferedModal: vi.fn(),
			manageAppClose: vi.fn(),
			setLatestChangelogVersion: vi.fn(),
			setIsStartupSequenceChecked: vi.fn(),
			setTestNetworkEnabled: vi.fn(),
			setTestDomainRaw: vi.fn(),
			setTestDomain: vi.fn(),
			setEnvKey: vi.fn(),
			setIsEnvironmentPending: vi.fn(),
			setTestServerHttpsEnabled: vi.fn(),
			setTestServerEndTime: vi.fn()
		} as unknown as CoreContext;

		initIpcHandlers(ctx);
		expect(ipcMain.on).toHaveBeenCalledWith(`show-ui`, expect.any(Function));
		expect(ipcMain.on).toHaveBeenCalledWith(`hide-ui`, expect.any(Function));
		expect(ipcMain.on).toHaveBeenCalledWith(`app-exit`, expect.any(Function));
		expect(ipcMain.on).toHaveBeenCalledWith(`network-status`, expect.any(Function));
		expect(ipcMain.on).toHaveBeenCalledWith(`environment-selected`, expect.any(Function));
		expect(ipcMain.on).toHaveBeenCalledWith(`save-setting`, expect.any(Function));
		expect(ipcMain.on).toHaveBeenCalledWith(`get-settings`, expect.any(Function));
		expect(ipcMain.on).toHaveBeenCalledWith(`test-server-setup-continue`, expect.any(Function));
		expect(ipcMain.on).toHaveBeenCalledWith(`test-server-stop`, expect.any(Function));
	});

	test(`registerUiProtocolHandler should call ses.protocol.handle`, () => {
		const ctx = {
			$paths: { uiSource: `` }
		} as unknown as CoreContext;
		const ses = session.fromPartition(`test`);
		registerUiProtocolHandler(ctx, ses);
		expect(ses.protocol.handle).toHaveBeenCalledWith(`ui`, expect.any(Function));
	});

	test(`registerEyasProtocolHandler should call ses.protocol.handle`, () => {
		const ctx = {
			$paths: { testSrc: `` }
		} as unknown as CoreContext;
		const ses = session.fromPartition(`test`);
		registerEyasProtocolHandler(ctx, ses);
		expect(ses.protocol.handle).toHaveBeenCalledWith(`eyas`, expect.any(Function));
	});

	test(`registerHttpsProtocolHandler should call ses.protocol.handle`, () => {
		const ctx = {
			$testDomain: `https://test.com`
		} as unknown as CoreContext;
		const ses = session.fromPartition(`test`);
		registerHttpsProtocolHandler(ctx, ses);
		expect(ses.protocol.handle).toHaveBeenCalledWith(`https`, expect.any(Function));
	});

	test(`registerInternalProtocols should call protocol.registerSchemesAsPrivileged`, () => {
		registerInternalProtocols();
		expect(protocol.registerSchemesAsPrivileged).toHaveBeenCalled();
	});
});

describe(`UI Expansion IPC`, () => {
	test(`show-ui IPC handler should call toggleEyasUI(true)`, () => {
		const ctx = {
			toggleEyasUI: vi.fn(),
			$eyasLayer: { webContents: { send: vi.fn() } }
		} as unknown as CoreContext;

		// get the handler registered by initIpcHandlers
		let showUiHandler: (() => void) | null = null;
		vi.spyOn(ipcMain, `on`).mockImplementation((channel, cb) => {
			if (channel === `show-ui`) { showUiHandler = cb as () => void; }
		});

		initIpcHandlers(ctx);

		if (!showUiHandler) { throw new Error(`show-ui handler not registered`); }

		// trigger the handler
		showUiHandler();

		expect(ctx.toggleEyasUI).toHaveBeenCalledWith(true);
	});
});

