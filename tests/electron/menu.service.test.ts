import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { BrowserWindow } from 'electron';
import type { ValidatedConfig } from '@registry/config.js';
import type { CoreContext } from '@registry/eyas-core.js';
import { Menu } from 'electron';
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



	describe(`getSerializableLinks`, () => {
		const config = {
			links: [
				{ label: `Google`, url: `https://google.com`, external: true },
				{ label: `Local`, url: `http://local.test`, external: false },
				{ label: `Variable`, url: `https://example.com/{myvar}`, external: false },
				{ label: `Host Variable`, url: `https://{myvar}example.com`, external: false },
				{ label: `Invalid`, url: `bad-url`, external: false }
			]
		} as unknown as ValidatedConfig;

		test(`should return empty array if no config`, () => {
			expect(menuService.getSerializableLinks(null)).toEqual([]);
		});

		test(`should return NavItem array with correct titles`, () => {
			const items = menuService.getSerializableLinks(config);
			expect(items).toHaveLength(5);
			expect(items[0].title).toBe(`🌐 Google`);
			expect(items[1].title).toBe(`Local`);
			expect(items[2].title).toBe(`Variable`);
			expect(items[3].title).toBe(`Host Variable`);
			expect(items[4].title).toBe(`Invalid (invalid entry: "bad-url")`);
		});

		test(`should encode url and external state in value`, () => {
			const items = menuService.getSerializableLinks(config);
			expect(items[0].value).toBe(`launch-link:{"url":"https://google.com/","openInBrowser":true}`);
			expect(items[1].value).toBe(`launch-link:{"url":"http://local.test/","openInBrowser":false}`);
		});

		test(`should identify variable links`, () => {
			const items = menuService.getSerializableLinks(config);
			expect(items[2].value).toBe(`launch-link-var:https://example.com/{myvar}`);
			expect(items[3].value).toBe(`launch-link-var:https://{myvar}example.com`);
		});

		test(`should disable invalid links`, () => {
			const items = menuService.getSerializableLinks(config);
			expect(items[4].actionable).toBe(false);
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
			const context = menuService.getContext(mockCtx);
			expect(context.testNetworkEnabled).toBe(true);
		});

		test(`refresh should gather all state and call Menu.setApplicationMenu`, async () => {
			await menuService.refresh(mockCtx);

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
			});
		});

		describe(`getTestServerHandlers`, () => {
			const handlers = menuService.getTestServerHandlers(mockCtx);

			test(`should handle network`, () => {
				handlers.toggleNetwork?.();
				expect(mockCtx.setTestNetworkEnabled).toHaveBeenCalledWith(false);
				expect(mockCtx.setMenu).toHaveBeenCalled();
			});
		});
	});
});

