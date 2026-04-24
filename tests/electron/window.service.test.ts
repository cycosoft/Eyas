import { describe, test, expect, vi, beforeEach } from 'vitest';
import { windowService } from '@core/window.service.js';
import { EYAS_HEADER_HEIGHT } from '@scripts/constants.js';
import type { CoreContext } from '@registry/eyas-core.js';

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
			on: vi.fn()
		}
	}))
}));

vi.mock(`@core/metrics-events.js`, () => ({ MP_EVENTS: {} }));

describe(`window.service.ts unit tests`, () => {
	let mockCtx: CoreContext;
	let mockLayer: { setBounds: ReturnType<typeof vi.fn>; setBackgroundColor: ReturnType<typeof vi.fn>; webContents: { loadURL: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> } };
	let mockWindow: { getContentSize: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; webContents: { on: ReturnType<typeof vi.fn> }; contentView: { addChildView: ReturnType<typeof vi.fn> } };

	beforeEach(() => {
		vi.clearAllMocks();

		mockLayer = {
			setBounds: vi.fn(),
			setBackgroundColor: vi.fn(),
			webContents: {
				loadURL: vi.fn(),
				on: vi.fn()
			}
		};

		mockWindow = {
			getContentSize: vi.fn().mockReturnValue([800, 600]),
			on: vi.fn(),
			webContents: { on: vi.fn() },
			contentView: { addChildView: vi.fn() }
		};

		mockCtx = {
			$appWindow: mockWindow,
			$eyasLayer: mockLayer,
			$currentViewport: [800, 600],
			$paths: { eventBridge: `bridge.js`, testPreload: `preload.js`, icon: `icon.png`, configLoader: ``, packageJson: ``, constants: ``, pathUtils: ``, timeUtils: ``, testSrc: null, uiSource: ``, eyasInterface: ``, splashScreen: `` },
			$config: null,
			$defaultViewports: [{ width: 800, height: 600, label: `default` }],
			$isDev: false,
			setAppWindow: vi.fn(),
			setEyasLayer: vi.fn(),
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
			(mockLayer as unknown as { getBounds: () => { x: number; y: number; width: number; height: number } }).getBounds =
				vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 });
			mockWindow.getContentSize = vi.fn().mockReturnValue([1024, 768]);

			windowService.handleResize(mockCtx);

			expect(mockLayer.setBounds).toHaveBeenCalledWith({ x: 0, y: 0, width: 1024, height: 768 });
		});

		test(`when UI layer is passive (header height), updates width but keeps header height on resize`, () => {
			// UI is passive: layer height equals EYAS_HEADER_HEIGHT
			mockLayer.setBounds = vi.fn();
			(mockLayer as unknown as { getBounds: () => { x: number; y: number; width: number; height: number } }).getBounds =
				vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: EYAS_HEADER_HEIGHT });
			mockWindow.getContentSize = vi.fn().mockReturnValue([1024, 768]);

			windowService.handleResize(mockCtx);

			expect(mockLayer.setBounds).toHaveBeenCalledWith({ x: 0, y: 0, width: 1024, height: EYAS_HEADER_HEIGHT });
		});

		test(`skips resize if dimensions have not changed`, () => {
			mockWindow.getContentSize = vi.fn().mockReturnValue([800, 600]); // same as $currentViewport

			windowService.handleResize(mockCtx);

			expect(mockLayer.setBounds).not.toHaveBeenCalled();
		});
	});

	describe(`EYAS_HEADER_HEIGHT contract`, () => {
		test(`EYAS_HEADER_HEIGHT is a non-negative number`, () => {
			expect(typeof EYAS_HEADER_HEIGHT).toBe(`number`);
			expect(EYAS_HEADER_HEIGHT).toBeGreaterThanOrEqual(0);
		});
	});
});
