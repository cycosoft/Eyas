import { describe, test, expect, vi, beforeEach } from 'vitest';
import { windowService } from '@core/window.service.js';
import { EYAS_HEADER_HEIGHT } from '@scripts/constants.js';
import type { CoreContext } from '@registry/eyas-core.js';
import type { CoreMockLayer, CoreMockWindow, CoreMockTestLayer } from '@test-registry/eyas-core.mocks.js';
import type { Rectangle } from '@registry/core.js';

// Mock electron
vi.mock(`electron`, () => ({
	BrowserWindow: vi.fn().mockImplementation(() => ({
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
			getTitle: vi.fn().mockReturnValue(`Test Title`)
		}
	})),
	WebContentsView: vi.fn().mockImplementation(() => ({
		setBounds: vi.fn(),
		setBackgroundColor: vi.fn(),
		isDestroyed: vi.fn().mockReturnValue(false),
		webContents: {
			loadURL: vi.fn(),
			on: vi.fn(),
			isDestroyed: vi.fn().mockReturnValue(false),
			getTitle: vi.fn().mockReturnValue(`Test Title`)
		}
	}))
}));

vi.mock(`@core/metrics-events.js`, () => ({ MP_EVENTS: {} }));

describe(`window.service.ts unit tests`, () => {
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
				session: { getCacheSize: vi.fn(async () => 0) }
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
			$config: null,
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

	describe(`initWindowListeners console-message handling`, () => {
		type EventListenerCallback = (...args: unknown[]) => void;
		let registeredListeners: Record<PropertyKey, EventListenerCallback>;

		beforeEach(() => {
			registeredListeners = {} as Record<PropertyKey, EventListenerCallback>;
			const testLayer = mockCtx.$testLayer as NonNullable<CoreContext[`$testLayer`]>;
			testLayer.webContents.on = vi.fn((event, callback) => {
				registeredListeners[event] = callback;
				return testLayer.webContents;
			}) as unknown as typeof testLayer.webContents.on;
		});

		test(`should increment errors on non-fallback URLs when level is 3`, () => {
			windowService.initWindowListeners(mockCtx);
			const callback = registeredListeners[`console-message`];
			expect(callback).toBeDefined();

			const testLayer = mockCtx.$testLayer as NonNullable<CoreContext[`$testLayer`]>;
			vi.mocked(testLayer.webContents.getURL).mockReturnValue(`https://test-site.com/home`);
			mockCtx.$jsErrorsCount = 5;

			callback(null, 3); // Level 3 = error

			expect(mockCtx.setJSErrorsCount).toHaveBeenCalledWith(6);
			expect(mockCtx.updateNavigationState).toHaveBeenCalled();
		});

		test(`should increment warnings on non-fallback URLs when level is 2`, () => {
			windowService.initWindowListeners(mockCtx);
			const callback = registeredListeners[`console-message`];
			expect(callback).toBeDefined();

			const testLayer = mockCtx.$testLayer as NonNullable<CoreContext[`$testLayer`]>;
			vi.mocked(testLayer.webContents.getURL).mockReturnValue(`https://test-site.com/home`);
			mockCtx.$jsWarningsCount = 12;

			callback(null, 2); // Level 2 = warning

			expect(mockCtx.setJSWarningsCount).toHaveBeenCalledWith(13);
			expect(mockCtx.updateNavigationState).toHaveBeenCalled();
		});

		test(`should ignore warnings (level 2) on about:blank fallback URL`, () => {
			windowService.initWindowListeners(mockCtx);
			const callback = registeredListeners[`console-message`];
			expect(callback).toBeDefined();

			const testLayer = mockCtx.$testLayer as NonNullable<CoreContext[`$testLayer`]>;
			vi.mocked(testLayer.webContents.getURL).mockReturnValue(`about:blank`);

			callback(null, 2);

			expect(mockCtx.setJSWarningsCount).not.toHaveBeenCalled();
			expect(mockCtx.updateNavigationState).not.toHaveBeenCalled();
		});

		test(`should ignore errors (level 3) on data:text/html fallback URL`, () => {
			windowService.initWindowListeners(mockCtx);
			const callback = registeredListeners[`console-message`];
			expect(callback).toBeDefined();

			const testLayer = mockCtx.$testLayer as NonNullable<CoreContext[`$testLayer`]>;
			vi.mocked(testLayer.webContents.getURL).mockReturnValue(`data:text/html,<html></html>`);

			callback(null, 3);

			expect(mockCtx.setJSErrorsCount).not.toHaveBeenCalled();
			expect(mockCtx.updateNavigationState).not.toHaveBeenCalled();
		});
	});

	describe(`handleResize`, () => {
		test(`when UI layer is active (full height), updates to new full height on resize`, () => {
			// UI is active: layer height matches the full viewport height
			mockLayer.setBounds = vi.fn();
			mockLayer.getBounds = vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 } as Rectangle);
			mockWindow.getContentSize = vi.fn().mockReturnValue([1024, 768]);

			windowService.handleResize(mockCtx);

			expect(mockLayer.setBounds).toHaveBeenCalledWith({ x: 0, y: 0, width: 1024, height: 768 });
			expect(mockTestLayer.setBounds).toHaveBeenCalledWith({
				x: 0,
				y: EYAS_HEADER_HEIGHT,
				width: 1024,
				height: 768 - EYAS_HEADER_HEIGHT
			});
		});

		test(`when UI layer is passive (header height), updates width but keeps header height on resize`, () => {
			// UI is passive: layer height equals EYAS_HEADER_HEIGHT
			mockLayer.setBounds = vi.fn();
			mockLayer.getBounds = vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: EYAS_HEADER_HEIGHT } as Rectangle);
			mockWindow.getContentSize = vi.fn().mockReturnValue([1024, 768]);

			windowService.handleResize(mockCtx);

			expect(mockLayer.setBounds).toHaveBeenCalledWith({ x: 0, y: 0, width: 1024, height: EYAS_HEADER_HEIGHT });
			expect(mockTestLayer.setBounds).toHaveBeenCalledWith({
				x: 0,
				y: EYAS_HEADER_HEIGHT,
				width: 1024,
				height: 768 - EYAS_HEADER_HEIGHT
			});
		});


	});

	describe(`EYAS_HEADER_HEIGHT contract`, () => {
		test(`EYAS_HEADER_HEIGHT is a non-negative number`, () => {
			expect(typeof EYAS_HEADER_HEIGHT).toBe(`number`);
			expect(EYAS_HEADER_HEIGHT).toBeGreaterThanOrEqual(0);
		});
	});
});
