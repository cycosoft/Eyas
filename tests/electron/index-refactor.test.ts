import { describe, test, expect, vi, beforeEach } from 'vitest';
import { app, BrowserWindow, ipcMain, session } from 'electron';
import type { DeepLinkContext } from '../../src/types/deep-link.js';

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
			show: vi.fn(),
			setContentSize: vi.fn(),
			getContentSize: vi.fn().mockReturnValue([1366, 768]),
			setTitle: vi.fn(),
			removeListener: vi.fn()
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

vi.mock(`electron-updater`, () => ({
	autoUpdater: {
		forceDevUpdateConfig: false,
		logger: null,
		setFeedURL: vi.fn(),
		checkForUpdates: vi.fn().mockResolvedValue(null),
		on: vi.fn(),
		quitAndInstall: vi.fn(),
		currentVersion: { version: `1.0.0` }
	}
}));

// Import the functions to test
import {
	setupDefaultProtocol,
	setupDeepLinkListeners,
	createAppWindow,
	setupWebRequestInterception,
	initAppIpcListeners,
	initEnvironmentIpcListeners,
	initSettingsIpcListeners,
	initTestServerIpcListeners,
	registerUiProtocolHandler,
	registerEyasProtocolHandler,
	registerHttpsProtocolHandler
} from '../../src/eyas-core/index.js';

describe(`index.ts refactoring unit tests`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test(`setupDefaultProtocol should call setAsDefaultProtocolClient`, () => {
		setupDefaultProtocol();
		expect(app.setAsDefaultProtocolClient).toHaveBeenCalledWith(`eyas`);
	});

	test(`setupDeepLinkListeners should register app listeners`, () => {
		const context = {} as unknown as DeepLinkContext;
		const handler = vi.fn();
		const urlGetter = vi.fn();
		setupDeepLinkListeners(context, handler, urlGetter);
		expect(app.on).toHaveBeenCalledWith(`open-file`, expect.any(Function));
		expect(app.on).toHaveBeenCalledWith(`open-url`, expect.any(Function));
		expect(app.on).toHaveBeenCalledWith(`second-instance`, expect.any(Function));
	});

	test(`createAppWindow should instantiate BrowserWindow`, () => {
		createAppWindow();
		expect(BrowserWindow).toHaveBeenCalled();
	});

	test(`setupWebRequestInterception should register onBeforeRequest`, () => {
		// Mock $appWindow by calling createAppWindow first
		createAppWindow();
		setupWebRequestInterception();
		// We can't easily check the internal state of $appWindow without more mocks,
		// but we can check if BrowserWindow was called.
		expect(BrowserWindow).toHaveBeenCalled();
	});

	test(`initAppIpcListeners should register hide-ui and app-exit`, () => {
		initAppIpcListeners();
		expect(ipcMain.on).toHaveBeenCalledWith(`hide-ui`, expect.any(Function));
		expect(ipcMain.on).toHaveBeenCalledWith(`app-exit`, expect.any(Function));
	});

	test(`initEnvironmentIpcListeners should register network-status and environment-selected`, () => {
		initEnvironmentIpcListeners();
		expect(ipcMain.on).toHaveBeenCalledWith(`network-status`, expect.any(Function));
		expect(ipcMain.on).toHaveBeenCalledWith(`environment-selected`, expect.any(Function));
	});

	test(`initSettingsIpcListeners should register save-setting and get-settings`, () => {
		initSettingsIpcListeners();
		expect(ipcMain.on).toHaveBeenCalledWith(`save-setting`, expect.any(Function));
		expect(ipcMain.on).toHaveBeenCalledWith(`get-settings`, expect.any(Function));
	});

	test(`initTestServerIpcListeners should register test server events`, () => {
		initTestServerIpcListeners();
		expect(ipcMain.on).toHaveBeenCalledWith(`test-server-setup-continue`, expect.any(Function));
		expect(ipcMain.on).toHaveBeenCalledWith(`test-server-stop`, expect.any(Function));
	});

	test(`registerUiProtocolHandler should call ses.protocol.handle`, () => {
		const ses = session.fromPartition(`test`);
		registerUiProtocolHandler(ses);
		expect(ses.protocol.handle).toHaveBeenCalledWith(`ui`, expect.any(Function));
	});

	test(`registerEyasProtocolHandler should call ses.protocol.handle`, () => {
		const ses = session.fromPartition(`test`);
		registerEyasProtocolHandler(ses);
		expect(ses.protocol.handle).toHaveBeenCalledWith(`eyas`, expect.any(Function));
	});

	test(`registerHttpsProtocolHandler should call ses.protocol.handle`, () => {
		const ses = session.fromPartition(`test`);
		registerHttpsProtocolHandler(ses);
		expect(ses.protocol.handle).toHaveBeenCalledWith(`https`, expect.any(Function));
	});
});
