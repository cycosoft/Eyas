import { describe, test, expect, vi, beforeEach } from 'vitest';
import { windowService } from '@core/window.service.js';
import { EYAS_HEADER_HEIGHT } from '@scripts/constants.js';
import type { CoreContext, CoreMockLayer, CoreMockWindow, CoreMockTestLayer } from '@registry/eyas-core.js';
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
		on: vi.fn(),
		webContents: {
			on: vi.fn(),
			getTitle: vi.fn().mockReturnValue(`Test Title`)
		}
	})),
	WebContentsView: vi.fn().mockImplementation(() => ({
		setBounds: vi.fn(),
		setBackgroundColor: vi.fn(),
		webContents: {
			loadURL: vi.fn(),
			on: vi.fn(),
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
			webContents: {
				loadURL: vi.fn(),
				on: vi.fn(),
				send: vi.fn(),
				focus: vi.fn(),
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
				session: { getCacheSize: vi.fn(async () => 0) }
			}
		};

		mockWindow = {
			getContentSize: vi.fn().mockReturnValue([800, 600]),
			on: vi.fn(),
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
			$isInitializing: false
		} as unknown as CoreContext;
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
