import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { BrowserWindow } from 'electron';
import type { ValidatedConfig } from '@registry/config.js';
import type { MenuLabel } from '@registry/primitives.js';
import type { CoreContext } from '@registry/eyas-core.js';
import { shell, clipboard, Menu } from 'electron';
import { menuService } from '@core/menu.service.js';

type MockMenuItem = { label?: MenuLabel; type?: string };

// Mock electron
vi.mock(`electron`, () => ({
	app: {
		quit: vi.fn()
	},
	Menu: {
		setApplicationMenu: vi.fn(),
		buildFromTemplate: vi.fn()
	},
	shell: {
		openPath: vi.fn()
	},
	clipboard: {
		writeText: vi.fn()
	}
}));

// Mock external scripts
vi.mock(`../../src/scripts/variable-utils.js`, () => ({
	isVariableLinkValid: vi.fn(url => url.includes(`{myvar}`))
}));

vi.mock(`../../src/scripts/parse-url.js`, () => ({
	parseURL: vi.fn(url => {
		if (url.startsWith(`http`)) return new URL(url);
		return null;
	})
}));

describe(`MenuService Helpers`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe(`getViewportMenuItems`, () => {
		const mockWindow = {
			setContentSize: vi.fn(),
			isDestroyed: vi.fn().mockReturnValue(false)
		} as unknown as BrowserWindow;

		const allViewports = [
			{ label: `Desktop`, width: 1366, height: 768, isDefault: true },
			{ label: `Tablet`, width: 768, height: 1024, isDefault: true },
			{ label: `Mobile`, width: 360, height: 640, isDefault: true }
		];

		const mockCtx = {
			$appWindow: mockWindow,
			$allViewports: allViewports,
			$currentViewport: [1366, 768]
		} as unknown as CoreContext;

		test(`should return empty array if no app window`, () => {
			expect(menuService.getViewportMenuItems({ ...mockCtx, $appWindow: null } as unknown as CoreContext)).toEqual([]);
		});

		test(`should identify selected viewport with 🔘 and inject separator`, () => {
			const items = menuService.getViewportMenuItems(mockCtx);

			// Should have separator before Desktop because it's default
			expect(items[0].type).toBe(`separator`);
			expect(items[1].label).toContain(`🔘 Desktop`);
			expect(items[2].label).not.toContain(`🔘`);
		});

		test(`should handle tolerance for matching`, () => {
			const items = menuService.getViewportMenuItems({ ...mockCtx, $currentViewport: [1367, 769] } as unknown as CoreContext); // 1px off
			expect(items[1].label).toContain(`🔘 Desktop`);
		});

		test(`should inject "Current" item if no match found`, () => {
			const items = menuService.getViewportMenuItems({ ...mockCtx, $currentViewport: [1000, 1000] } as unknown as CoreContext);
			expect(items[0].label).toBe(`🔘 Current (1000 x 1000)`);
			expect(items[1].type).toBe(`separator`);
			expect(items.some((i: MockMenuItem) => i.label?.includes(`🔘 Desktop`))).toBe(false);
		});

		test(`click handler should call setContentSize`, () => {
			const items = menuService.getViewportMenuItems(mockCtx);
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
				{ label: `Local`, url: `http://local.test`, external: false },
				{ label: `Variable`, url: `https://example.com/{myvar}`, external: false }
			]
		} as unknown as ValidatedConfig;

		test(`should return empty array if no config`, () => {
			expect(menuService.getLinkMenuItems(null, handlers)).toEqual([]);
		});

		test(`should correctly label external links with 🌐`, () => {
			const items = menuService.getLinkMenuItems(config, handlers);
			expect(items[0].label).toContain(`🌐 Google`);
			expect(items[1].label).not.toContain(`🌐`);
		});

		test(`should use navigate for static links`, () => {
			const items = menuService.getLinkMenuItems(config, handlers);
			(items[0].click as () => void)();
			expect(handlers.navigate).toHaveBeenCalledWith(`https://google.com/`, true);
		});

		test(`should use navigateVariable for links with variables`, () => {
			const items = menuService.getLinkMenuItems(config, handlers);
			(items[2].click as () => void)();
			expect(handlers.navigateVariable).toHaveBeenCalledWith(`https://example.com/{myvar}`);
		});

		test(`should mark invalid links`, () => {
			const badConfig = {
				links: [{ label: `Bad`, url: `not-a-url`, external: false }]
			} as unknown as ValidatedConfig;
			const items = menuService.getLinkMenuItems(badConfig, handlers);
			expect(items[0].label).toContain(`invalid entry`);
		});
	});

	describe(`getContext and handlers`, () => {
		const mockWindow = {
			isDestroyed: vi.fn().mockReturnValue(false),
			webContents: {
				getStoragePath: vi.fn(() => `/mock/path`),
				isDestroyed: vi.fn().mockReturnValue(false),
				session: {
					getStoragePath: vi.fn(() => `/mock/path`),
					getCacheSize: vi.fn(async () => 100)
				}
			}
		} as unknown as BrowserWindow;

		const mockTestLayer = {
			isDestroyed: vi.fn().mockReturnValue(false),
			webContents: {
				reloadIgnoringCache: vi.fn(),
				goBack: vi.fn(),
				goForward: vi.fn(),
				getURL: vi.fn(() => `https://current.url`),
				toggleDevTools: vi.fn(),
				isDestroyed: vi.fn().mockReturnValue(false),
				session: { getCacheSize: vi.fn(async () => 100) }
			}
		};

		const mockCtx = {
			showAbout: vi.fn(),
			onOpenSettings: vi.fn(),
			showTestServerSetup: vi.fn(),
			uiEvent: vi.fn(),
			navigate: vi.fn(),
			startAFreshTest: vi.fn(),
			setTestNetworkEnabled: vi.fn(),
			setMenu: vi.fn(),
			clearCache: vi.fn(),
			stopTestServer: vi.fn(),
			onToggleTestServerHttps: vi.fn(),
			getSessionAge: vi.fn(() => `1m`),
			updateService: {
				getStatus: vi.fn(() => `idle`),
				checkForUpdates: vi.fn(),
				installUpdate: vi.fn()
			},
			$appWindow: mockWindow,
			$testLayer: mockTestLayer,
			$eyasLayer: {
				isDestroyed: vi.fn().mockReturnValue(false),
				webContents: {
					openDevTools: vi.fn(),
					isDestroyed: vi.fn().mockReturnValue(false)
				}
			},
			$allViewports: [
				{ label: `Desktop`, width: 1366, height: 768, isDefault: true }
			],
			$currentViewport: [1366, 768],
			$isInitializing: false,
			$config: {
				meta: { isConfigLoaded: true },
				links: []
			},
			$testNetworkEnabled: true,
			$lastTestServerOptions: { port: 3000 },
			$testServerHttpsEnabled: false,
			$isEnvironmentPending: false
		} as unknown as CoreContext;

		test(`getContext should assemble all handlers and state`, () => {
			const params = {
				sessionAge: `1m`,
				cacheSize: 100,
				viewportItems: [],
				linkItems: []
			};
			const context = menuService.getContext(mockCtx, params);
			expect(context.appName).toBe(`Eyas`);
			expect(context.sessionAge).toBe(`1m`);
			expect(context.cacheSize).toBe(100);
			expect(context.testNetworkEnabled).toBe(true);
			expect(context.testServerActive).toBe(true);
		});

		test(`refresh should gather all state and call Menu.setApplicationMenu`, async () => {
			await menuService.refresh(mockCtx);

			expect(mockCtx.getSessionAge).toHaveBeenCalled();
			expect(mockTestLayer.webContents.session.getCacheSize).toHaveBeenCalled();
			expect(Menu.buildFromTemplate).toHaveBeenCalled();
			expect(Menu.setApplicationMenu).toHaveBeenCalled();
		});

		describe(`getAppHandlers`, () => {
			const handlers = menuService.getAppHandlers(mockCtx);

			test(`should map app lifecycle methods`, () => {
				handlers.onOpenSettings?.();
				expect(mockCtx.onOpenSettings).toHaveBeenCalled();

				handlers.onShowWhatsNew?.();
				expect(mockCtx.uiEvent).toHaveBeenCalledWith(`show-whats-new`, true);
			});

			test(`should map status flags`, () => {
				expect(handlers.isInitializing).toBe(false);
				expect(handlers.isConfigLoaded).toBe(true);
				expect(handlers.isEnvironmentPending).toBe(false);
			});
		});

		describe(`getNavigationHandlers`, () => {
			const handlers = menuService.getNavigationHandlers(mockCtx);

			test(`navigateHome should call navigate`, () => {
				handlers.navigateHome?.();
				expect(mockCtx.navigate).toHaveBeenCalled();
			});

			test(`browser controls should call webContents methods`, () => {
				handlers.reload?.();
				expect(mockTestLayer.webContents.reloadIgnoringCache).toHaveBeenCalled();

				handlers.back?.();
				expect(mockTestLayer.webContents.goBack).toHaveBeenCalled();

				handlers.forward?.();
				expect(mockTestLayer.webContents.goForward).toHaveBeenCalled();

				handlers.copyUrl?.();
				expect(mockTestLayer.webContents.getURL).toHaveBeenCalled();
				expect(clipboard.writeText).toHaveBeenCalledWith(`https://current.url`);
			});
		});

		describe(`getTestServerHandlers`, () => {
			const handlers = menuService.getTestServerHandlers(mockCtx);

			test(`should handle network and cache`, () => {
				handlers.toggleNetwork?.();
				expect(mockCtx.setTestNetworkEnabled).toHaveBeenCalledWith(false);
				expect(mockCtx.setMenu).toHaveBeenCalled();

				handlers.clearCache?.();
				expect(mockCtx.clearCache).toHaveBeenCalled();

				handlers.openCacheFolder?.();
				expect(shell.openPath).toHaveBeenCalledWith(`/mock/path`);
			});

			test(`should handle test server lifecycle`, () => {
				handlers.startAFreshTest?.();
				expect(mockCtx.startAFreshTest).toHaveBeenCalledWith(true);

				handlers.onStartTestServer?.();
				expect(mockCtx.showTestServerSetup).toHaveBeenCalled();

				handlers.onStopTestServer?.();
				expect(mockCtx.stopTestServer).toHaveBeenCalled();
			});

			test(`should handle updates`, () => {
				expect(handlers.updateStatus).toBe(`idle`);
				handlers.onCheckForUpdates?.();
				expect(mockCtx.updateService.checkForUpdates).toHaveBeenCalled();
				handlers.onInstallUpdate?.();
				expect(mockCtx.updateService.installUpdate).toHaveBeenCalled();
			});

			test(`should handle dev tools`, () => {
				handlers.toggleTestDevTools?.();
				expect(mockTestLayer.webContents.toggleDevTools).toHaveBeenCalled();

				handlers.openUiDevTools?.();
				expect(mockCtx.$eyasLayer?.webContents.openDevTools).toHaveBeenCalledWith({ mode: `detach` });
			});
		});
	});
});
