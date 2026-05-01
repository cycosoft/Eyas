import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { BrowserWindow } from 'electron';
import type { ValidatedConfig } from '@registry/config.js';
import type { CoreContext } from '@registry/eyas-core.js';
import { shell, clipboard, Menu } from 'electron';
import { menuService } from '@core/menu.service.js';


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
			goBack: vi.fn(),
			goForward: vi.fn(),
			reload: vi.fn(),
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
			$isEnvironmentPending: false
		} as unknown as CoreContext;

		test(`getContext should assemble all handlers and state`, () => {
			const params = {
				sessionAge: `1m`,
				cacheSize: 100,
				linkItems: []
			};
			const context = menuService.getContext(mockCtx, params);
			expect(context.appName).toBe(`Eyas`);
			expect(context.sessionAge).toBe(`1m`);
			expect(context.cacheSize).toBe(100);
			expect(context.testNetworkEnabled).toBe(true);
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

			test(`browser controls should call context navigation methods`, () => {
				handlers.reload?.();
				expect(mockCtx.reload).toHaveBeenCalled();

				handlers.back?.();
				expect(mockCtx.goBack).toHaveBeenCalled();

				handlers.forward?.();
				expect(mockCtx.goForward).toHaveBeenCalled();

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
