import { vi, type Mock } from 'vitest';

// Simplest possible mock
vi.mock(`electron`, () => {
	const mockWebContents = {
		on: vi.fn(),
		isDestroyed: vi.fn().mockReturnValue(false),
		getTitle: vi.fn().mockReturnValue(`Test Title`),
		toggleDevTools: vi.fn(),
		loadURL: vi.fn(),
		navigationHistory: { clear: vi.fn() }
	};

	function MockBrowserWindow(): GenericRecord {
		return {
			getContentSize: vi.fn().mockReturnValue([800, 600]),
			loadURL: vi.fn(),
			center: vi.fn(),
			show: vi.fn(),
			destroy: vi.fn(),
			setTitle: vi.fn(),
			isDestroyed: vi.fn().mockReturnValue(false),
			on: vi.fn(),
			webContents: mockWebContents,
			contentView: { addChildView: vi.fn() }
		};
	}

	function MockWebContentsView(): GenericRecord {
		return {
			setBounds: vi.fn(),
			setBackgroundColor: vi.fn(),
			isDestroyed: vi.fn().mockReturnValue(false),
			webContents: mockWebContents
		};
	}

	return {
		BrowserWindow: MockBrowserWindow,
		WebContentsView: MockWebContentsView
	};
});

import { describe, test, expect, beforeEach } from 'vitest';
import { windowService } from '@core/window.service.js';
import type { CoreContext } from '@registry/eyas-core.js';
import type { GenericRecord } from '@registry/primitives.js';

describe(`window.service.ts shortcut tests`, () => {
	let mockCtx: CoreContext;

	beforeEach(() => {
		vi.clearAllMocks();

		mockCtx = {
			$appWindow: null,
			$eyasLayer: null,
			$testLayer: null,
			$currentViewport: [800, 600],
			$paths: { eventBridge: `bridge.js`, testPreload: `preload.js`, icon: `icon.png`, configLoader: ``, packageJson: ``, constants: ``, pathUtils: ``, timeUtils: ``, testSrc: null, uiSource: ``, eyasInterface: ``, splashScreen: `` },
			$config: { meta: { testId: `test` } },
			$defaultViewports: [{ width: 800, height: 600, label: `default` }],
			$isDev: false,
			setAppWindow: vi.fn(win => { mockCtx.$appWindow = win; }),
			setEyasLayer: vi.fn(layer => { mockCtx.$eyasLayer = layer; }),
			setTestLayer: vi.fn(layer => { mockCtx.$testLayer = layer; }),
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
			$isInitializing: false
		} as unknown as CoreContext;
	});

	test(`F12 shortcut toggles devtools on test layer when pressed in UI layer`, async () => {
		// Initialize the UI layer to register listeners
		await windowService.initElectronUi(mockCtx);

		// Find the 'before-input-event' listener registered on the UI layer
		const uiOnCall = (mockCtx.$eyasLayer?.webContents.on as Mock).mock.calls.find(
			call => call[0] === `before-input-event`
		);
		expect(uiOnCall).toBeDefined();
		if (!uiOnCall) { throw new Error(`uiOnCall is undefined`); }
		const handler = uiOnCall[1];

		// Simulate F12 press
		const preventDefault = vi.fn();
		handler({ preventDefault }, { type: `keyDown`, key: `F12` });

		// Verify that the test layer's devtools were toggled
		expect(mockCtx.$testLayer?.webContents.toggleDevTools).toHaveBeenCalled();
		expect(preventDefault).toHaveBeenCalled();
	});

	test(`F12 shortcut toggles devtools on test layer when pressed in test layer`, async () => {
		// Initialize the UI to register listeners
		await windowService.initElectronUi(mockCtx);

		// Find the 'before-input-event' listener registered on the test layer
		const testOnCall = (mockCtx.$testLayer?.webContents.on as Mock).mock.calls.find(
			call => call[0] === `before-input-event`
		);
		expect(testOnCall).toBeDefined();
		if (!testOnCall) { throw new Error(`testOnCall is undefined`); }
		const handler = testOnCall[1];

		// Simulate F12 press
		const preventDefault = vi.fn();
		handler({ preventDefault }, { type: `keyDown`, key: `F12` });

		// Verify that the test layer's devtools were toggled
		expect(mockCtx.$testLayer?.webContents.toggleDevTools).toHaveBeenCalled();
		expect(preventDefault).toHaveBeenCalled();
	});

	test(`other keys do not toggle devtools`, async () => {
		await windowService.initElectronUi(mockCtx);

		const uiOnCall = (mockCtx.$eyasLayer?.webContents.on as Mock).mock.calls.find(
			call => call[0] === `before-input-event`
		);
		if (!uiOnCall) { throw new Error(`uiOnCall is undefined`); }
		const handler = uiOnCall[1];

		const preventDefault = vi.fn();
		handler({ preventDefault }, { type: `keyDown`, key: `F11` });

		expect(mockCtx.$testLayer?.webContents.toggleDevTools).not.toHaveBeenCalled();
		expect(preventDefault).not.toHaveBeenCalled();
	});
});
