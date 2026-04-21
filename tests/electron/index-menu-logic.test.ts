import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BrowserWindow } from 'electron';
import type { ValidatedConfig } from '@registry/config.js';
import type { TestServerState } from '@registry/test-server.js';
import type { MenuLabel } from '@registry/primitives.js';

type MockMenuItem = { label?: MenuLabel };

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
		handle: vi.fn()
	},
	nativeTheme: {
		on: vi.fn()
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

// Mock test-server
vi.mock(`../../src/eyas-core/test-server/test-server.js`, () => ({
	getTestServerState: vi.fn()
}));

// Mock settings-service
vi.mock(`../../src/eyas-core/settings-service.js`, () => ({
	get: vi.fn(),
	getProjectSettings: vi.fn(),
	getAppSettings: vi.fn(),
	load: vi.fn().mockResolvedValue(undefined),
	save: vi.fn().mockResolvedValue(undefined)
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

// Import the functions to test
import { getViewportMenuItems, getLinkMenuItems, getTestServerRemainingTime } from '@core/index.js';
import * as testServer from '@core/test-server/test-server.js';

describe(`index menu logic helpers`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe(`getViewportMenuItems`, () => {
		const mockWindow = {
			setContentSize: vi.fn()
		} as unknown as BrowserWindow;

		const allViewports = [
			{ label: `Desktop`, width: 1366, height: 768, isDefault: true },
			{ label: `Tablet`, width: 768, height: 1024, isDefault: true },
			{ label: `Mobile`, width: 360, height: 640, isDefault: true }
		];

		test(`should return empty array if no app window`, () => {
			expect(getViewportMenuItems(null, allViewports, [1366, 768])).toEqual([]);
		});

		test(`should identify selected viewport with 🔘 and inject separator`, () => {
			const items = getViewportMenuItems(mockWindow, allViewports, [1366, 768]);

			// Should have separator before Desktop because it's default
			expect(items[0].type).toBe(`separator`);
			expect(items[1].label).toContain(`🔘 Desktop`);
			expect(items[2].label).not.toContain(`🔘`);
		});

		test(`should handle tolerance for matching`, () => {
			const items = getViewportMenuItems(mockWindow, allViewports, [1367, 769]); // 1px off
			expect(items[1].label).toContain(`🔘 Desktop`);
		});

		test(`should inject "Current" item if no match found`, () => {
			const items = getViewportMenuItems(mockWindow, allViewports, [1000, 1000]);
			expect(items[0].label).toBe(`🔘 Current (1000 x 1000)`);
			expect(items[1].type).toBe(`separator`);
			expect(items.some((i: MockMenuItem) => i.label?.includes(`🔘 Desktop`))).toBe(false);
		});

		test(`click handler should call setContentSize`, () => {
			const items = getViewportMenuItems(mockWindow, allViewports, [1366, 768]);
			const desktopItem = items[1];
			(desktopItem.click as () => void)();
			expect(mockWindow.setContentSize).toHaveBeenCalledWith(1366, 768);
		});
	});

	describe(`getLinkMenuItems`, () => {
		const handlers = {
			navigate: vi.fn(),
			navigateVariable: vi.fn()
		};

		const config = {
			links: [
				{ label: `Google`, url: `https://google.com`, external: true },
				{ label: `Local`, url: `eyas://local.test`, external: false },
				{ label: `Variable`, url: `https://example.com/{myvar}`, external: false }
			]
		} as unknown as ValidatedConfig;

		test(`should return empty array if no config`, () => {
			expect(getLinkMenuItems(null, handlers)).toEqual([]);
		});

		test(`should correctly label external links with 🌐`, () => {
			const items = getLinkMenuItems(config, handlers);
			expect(items[0].label).toContain(`🌐 Google`);
			expect(items[1].label).not.toContain(`🌐`);
		});

		test(`should use navigate for static links`, () => {
			const items = getLinkMenuItems(config, handlers);
			(items[0].click as () => void)();
			expect(handlers.navigate).toHaveBeenCalledWith(`https://google.com/`, true);
		});

		test(`should use navigateVariable for links with variables`, () => {
			const items = getLinkMenuItems(config, handlers);
			(items[2].click as () => void)();
			expect(handlers.navigateVariable).toHaveBeenCalledWith(`https://example.com/{myvar}`);
		});

		test(`should mark invalid links`, () => {
			const badConfig = {
				links: [{ label: `Bad`, url: `not-a-url`, external: false }]
			} as unknown as ValidatedConfig;
			const items = getLinkMenuItems(badConfig, handlers);
			expect(items[0].label).toContain(`invalid entry`);
			expect(items[0].enabled).toBe(false);
		});
	});

	describe(`getTestServerRemainingTime`, () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		test(`should return empty string if no server state`, () => {
			vi.mocked(testServer.getTestServerState).mockReturnValue(null);
			expect(getTestServerRemainingTime()).toBe(``);
		});

		test(`should return formatted duration if server is active`, () => {
			vi.useFakeTimers();
			const now = Date.now();
			const startedAt = now - 1000 * 60 * 5; // exactly 5 minutes ago (frozen clock)
			vi.mocked(testServer.getTestServerState).mockReturnValue({
				startedAt,
				url: `http://localhost:1234`,
				customUrl: undefined,
				port: 1234,
				useHttps: false
			} as TestServerState);

			const result = getTestServerRemainingTime();
			expect(result).toBe(`25m`);
		});
	});
});
