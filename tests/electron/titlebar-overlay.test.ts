import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { ipcMain, type IpcMainEvent } from 'electron';
import { initIpcHandlers } from '@core/ipc-handlers.js';
import type { CoreContext } from '@registry/eyas-core.js';
import type { TitleBarOverlayPayload } from '@registry/ipc.js';

// Mock electron
vi.mock(`electron`, () => ({
	ipcMain: {
		on: vi.fn(),
		handle: vi.fn(),
		removeListener: vi.fn()
	},
	nativeTheme: {
		on: vi.fn(),
		themeSource: `system`
	},
	app: {
		on: vi.fn(),
		quit: vi.fn()
	},
	shell: {
		openPath: vi.fn()
	},
	clipboard: {
		writeText: vi.fn()
	}
}));

// Mock other dependencies
vi.mock(`@scripts/parse-url.js`, () => ({
	parseURL: vi.fn()
}));

vi.mock(`./settings-service.js`, () => ({
	set: vi.fn(),
	save: vi.fn(),
	getProjectSettings: vi.fn(),
	getAppSettings: vi.fn()
}));

vi.mock(`./test-server/test-server.js`, () => ({
	getTestServerState: vi.fn()
}));

vi.mock(`./test-server/test-server-timeout.js`, () => ({
	cancelTestServerTimeout: vi.fn(),
	startTestServerTimeout: vi.fn()
}));

const platformMocks = vi.hoisted(() => ({
	isMac: false,
	isWindows: false
}));

vi.mock(`@scripts/platform-utils.js`, () => platformMocks);

type MockWindow = {
	isDestroyed: Mock;
	setTitleBarOverlay: Mock;
	removeListener: Mock;
}

type MockUpdateService = {
	getStatus: Mock;
}

describe(`Titlebar Overlay IPC Handler`, () => {
	let mockCtx: Partial<CoreContext>;
	let overlayHandler: ((event: IpcMainEvent, options: TitleBarOverlayPayload) => void) | undefined;

	beforeEach(() => {
		vi.clearAllMocks();

		const mockWindow: MockWindow = {
			isDestroyed: vi.fn().mockReturnValue(false),
			setTitleBarOverlay: vi.fn(),
			removeListener: vi.fn()
		};

		const mockUpdateService: MockUpdateService = {
			getStatus: vi.fn()
		};

		mockCtx = {
			$appWindow: mockWindow as unknown as CoreContext[`$appWindow`],
			updateService: mockUpdateService as unknown as CoreContext[`updateService`]
		};

		vi.spyOn(ipcMain, `on`).mockImplementation((channel, cb) => {
			if (channel === `update-titlebar-overlay`) {
				overlayHandler = cb as unknown as typeof overlayHandler;
			}
			return ipcMain;
		});

		initIpcHandlers(mockCtx as CoreContext);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test(`should NOT call setTitleBarOverlay on MacOS (isMac = true)`, () => {
		platformMocks.isMac = true;
		platformMocks.isWindows = false;

		if (!overlayHandler) {
			throw new Error(`update-titlebar-overlay handler not registered`);
		}

		overlayHandler({} as IpcMainEvent, { color: `#000`, symbolColor: `#fff` });

		const mockWindow = mockCtx.$appWindow as unknown as MockWindow;
		expect(mockWindow.setTitleBarOverlay).not.toHaveBeenCalled();
	});

	test(`should call setTitleBarOverlay on Windows (isWindows = true)`, () => {
		platformMocks.isMac = false;
		platformMocks.isWindows = true;

		if (!overlayHandler) {
			throw new Error(`update-titlebar-overlay handler not registered`);
		}

		overlayHandler({} as IpcMainEvent, { color: `#000`, symbolColor: `#fff` });

		const mockWindow = mockCtx.$appWindow as unknown as MockWindow;
		expect(mockWindow.setTitleBarOverlay).toHaveBeenCalledWith({
			color: `#000`,
			symbolColor: `#fff`,
			height: 30
		});
	});
});
