import { describe, test, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow, WebContentsView } from 'electron';
import { windowService } from '@core/window.service.js';
import type { CoreContext } from '@registry/eyas-core.js';
import type { CoreMockLayer, CoreMockWindow, CoreMockTestLayer } from '@test-registry/eyas-core.mocks.js';
import type { Rectangle } from '@registry/core.js';

// Mock electron using constructible functions/classes with explicit return types and backticks
vi.mock(`electron`, () => {
	const mockSession = {
		webRequest: {
			onBeforeRequest: vi.fn()
		},
		setPreloads: vi.fn(),
		registerPreloadScript: vi.fn(),
		cookies: {
			get: vi.fn(),
			set: vi.fn()
		}
	};

	function MockBrowserWindow(): unknown {
		return {
			getContentSize: vi.fn().mockReturnValue([800, 600]),
			loadURL: vi.fn(),
			center: vi.fn(),
			show: vi.fn(),
			destroy: vi.fn(),
			setTitle: vi.fn(),
			isDestroyed: vi.fn().mockReturnValue(false),
			on: vi.fn(),
			webContents: {
				on: vi.fn(),
				isDestroyed: vi.fn().mockReturnValue(false),
				getTitle: vi.fn().mockReturnValue(`Test Title`),
				session: mockSession
			},
			contentView: {
				addChildView: vi.fn()
			}
		};
	}

	function MockWebContentsView(): unknown {
		return {
			setBounds: vi.fn(),
			setBackgroundColor: vi.fn(),
			isDestroyed: vi.fn().mockReturnValue(false),
			webContents: {
				loadURL: vi.fn(),
				on: vi.fn(),
				isDestroyed: vi.fn().mockReturnValue(false),
				getTitle: vi.fn().mockReturnValue(`Test Title`),
				session: mockSession
			}
		};
	}

	return {
		BrowserWindow: vi.fn().mockImplementation(MockBrowserWindow),
		WebContentsView: vi.fn().mockImplementation(MockWebContentsView)
	};
});

vi.mock(`@core/metrics-events.js`, () => ({ MP_EVENTS: { core: { launch: `launch` } } }));

describe(`Session Isolation (UI & Test Layers)`, () => {
	let mockCtx: CoreContext;
	let mockLayer: CoreMockLayer;
	let mockWindow: CoreMockWindow;
	let mockTestLayer: CoreMockTestLayer;

	beforeEach(() => {
		vi.clearAllMocks();

		mockLayer = {
			setBounds: vi.fn(),
			setBackgroundColor: vi.fn(),
			getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 } as Rectangle),
			isDestroyed: vi.fn().mockReturnValue(false),
			webContents: {
				loadURL: vi.fn(),
				on: vi.fn(),
				send: vi.fn(),
				focus: vi.fn(),
				isDestroyed: vi.fn().mockReturnValue(false),
				isFocused: vi.fn().mockReturnValue(true)
			}
		};

		mockTestLayer = {
			setBounds: vi.fn(),
			webContents: {
				loadURL: vi.fn(),
				on: vi.fn(),
				getURL: vi.fn().mockReturnValue(`https://test.com`),
				getTitle: vi.fn().mockReturnValue(`Test Title`),
				reloadIgnoringCache: vi.fn(),
				goBack: vi.fn(),
				goForward: vi.fn(),
				toggleDevTools: vi.fn(),
				isDestroyed: vi.fn().mockReturnValue(false),
				session: { getCacheSize: vi.fn(async () => 0), registerPreloadScript: vi.fn() }
			}
		};

		mockWindow = {
			getContentSize: vi.fn().mockReturnValue([800, 600]),
			on: vi.fn(),
			isDestroyed: vi.fn().mockReturnValue(false),
			webContents: {
				on: vi.fn(),
				session: {
					webRequest: {
						onBeforeRequest: vi.fn()
					}
				}
			},
			contentView: { addChildView: vi.fn() }
		};

		mockCtx = {
			$appWindow: mockWindow,
			$eyasLayer: mockLayer,
			$testLayer: mockTestLayer,
			$currentViewport: [800, 600],
			$paths: { eventBridge: `bridge.js`, testPreload: `preload.js`, icon: `icon.png`, configLoader: ``, packageJson: ``, constants: ``, pathUtils: ``, timeUtils: ``, testSrc: null, uiSource: ``, eyasInterface: ``, splashScreen: `` },
			$config: {
				meta: {
					testId: `custom-test-id`
				}
			},
			$defaultViewports: [{ width: 800, height: 600, label: `default` }],
			$isDev: false,
			setAppWindow: vi.fn(),
			setEyasLayer: vi.fn(),
			setTestLayer: vi.fn(),
			setMenu: vi.fn(),
			setIsInitializing: vi.fn(),
			getAppTitle: vi.fn().mockReturnValue(`Eyas`),
			trackEvent: vi.fn(),
			checkStartupSequence: vi.fn(),
			startAFreshTest: vi.fn(),
			initIpcHandlers: vi.fn(),
			setupWebRequestInterception: vi.fn(),
			checkExpiration: vi.fn(),
			manageAppClose: vi.fn(),
			onTitleUpdate: vi.fn(),
			updateNavigationState: vi.fn(),
			$isInitializing: false,
			$jsErrorsCount: 0,
			$jsWarningsCount: 0,
			setJSErrorsCount: vi.fn(),
			setJSWarningsCount: vi.fn()
		} as unknown as CoreContext;
	});

	describe(`Scenario: Isolated partitions are created on initialization`, () => {
		test(`should create a partition ending in -test for $testLayer and -ui for $eyasLayer`, () => {
			// Initialize layers
			windowService.createAppWindow(mockCtx);
			const dummySplash = new BrowserWindow();
			windowService.initEyasLayer(mockCtx, dummySplash, performance.now());

			// Inspect calls to WebContentsView constructor
			const mockWebContentsView = vi.mocked(WebContentsView);
			expect(mockWebContentsView).toHaveBeenCalled();

			// First call should be for test layer (inside createAppWindow)
			const testLayerArgs = mockWebContentsView.mock.calls[0]?.[0];
			expect(testLayerArgs).toBeDefined();
			expect(testLayerArgs?.webPreferences?.partition).toBe(`persist:custom-test-id-test`);

			// Second call should be for eyas UI layer (inside initEyasLayer)
			// The UI layer is app-wide by design (not test-scoped)
			const eyasLayerArgs = mockWebContentsView.mock.calls[1]?.[0];
			expect(eyasLayerArgs).toBeDefined();
			expect(eyasLayerArgs?.webPreferences?.partition).toBe(`persist:eyas-ui`);
		});

		test(`should fallback gracefully if testId is missing or config is undefined`, () => {
			mockCtx.$config = null;
			windowService.createAppWindow(mockCtx);
			const dummySplash = new BrowserWindow();
			windowService.initEyasLayer(mockCtx, dummySplash, performance.now());

			const mockWebContentsView = vi.mocked(WebContentsView);
			const testLayerArgs = mockWebContentsView.mock.calls[0]?.[0];
			expect(testLayerArgs).toBeDefined();
			expect(testLayerArgs?.webPreferences?.partition).toBe(`persist:default-test`);

			const eyasLayerArgs = mockWebContentsView.mock.calls[1]?.[0];
			expect(eyasLayerArgs).toBeDefined();
			expect(eyasLayerArgs?.webPreferences?.partition).toBe(`persist:eyas-ui`);
		});
	});

	describe(`Scenario: Preloads do not cross session boundaries`, () => {
		test(`should configure distinct partitions ensuring separate sessions and preload sandboxes`, () => {
			windowService.createAppWindow(mockCtx);
			const dummySplash = new BrowserWindow();
			windowService.initEyasLayer(mockCtx, dummySplash, performance.now());

			const mockWebContentsView = vi.mocked(WebContentsView);
			const testLayerArgs = mockWebContentsView.mock.calls[0]?.[0];
			const eyasLayerArgs = mockWebContentsView.mock.calls[1]?.[0];

			expect(testLayerArgs).toBeDefined();
			expect(eyasLayerArgs).toBeDefined();

			const testLayerPartition = testLayerArgs?.webPreferences?.partition;
			const eyasLayerPartition = eyasLayerArgs?.webPreferences?.partition;

			// Distinct partitions guarantee separate sessions and preloads
			expect(testLayerPartition).not.toBe(eyasLayerPartition);
		});
	});

	describe(`Scenario: Storage is isolated between layers`, () => {
		test(`should use different partitions to enforce separate cookie/localStorage/indexedDB stores`, () => {
			windowService.createAppWindow(mockCtx);
			const dummySplash = new BrowserWindow();
			windowService.initEyasLayer(mockCtx, dummySplash, performance.now());

			const mockWebContentsView = vi.mocked(WebContentsView);
			const testLayerArgs = mockWebContentsView.mock.calls[0]?.[0];
			const eyasLayerArgs = mockWebContentsView.mock.calls[1]?.[0];

			expect(testLayerArgs).toBeDefined();
			expect(eyasLayerArgs).toBeDefined();

			const testLayerPartition = testLayerArgs?.webPreferences?.partition;
			const eyasLayerPartition = eyasLayerArgs?.webPreferences?.partition;

			expect(testLayerPartition).toContain(`-test`);
			expect(eyasLayerPartition).toContain(`-ui`);
			expect(testLayerPartition).not.toBe(eyasLayerPartition);
		});
	});
});
