import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateService } from '@core/update.service.js';
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;
import * as settingsService from '@core/settings-service.js';
import type { CoreContext } from '@registry/eyas-core.js';
import type { GenericKey, AppVersion, Count } from '@registry/primitives.js';

/** Any function type for mocking */
type AnyFunction = (...args: unknown[]) => unknown;



/** Type for triggering events on the mock auto-updater */
type AutoUpdaterMock = {
	emit: (event: GenericKey, ...args: unknown[]) => void;
	_listeners: Record<GenericKey, AnyFunction[]>;
};

// Mock electron-updater
vi.mock(`electron-updater`, () => {
	const autoUpdaterMock = {
		_listeners: {} as Record<GenericKey, AnyFunction[]>,
		forceDevUpdateConfig: false,
		autoInstallOnAppQuit: true,
		logger: {},
		setFeedURL: vi.fn(),
		checkForUpdates: vi.fn().mockResolvedValue({}),
		quitAndInstall: vi.fn(),
		on: vi.fn((event, cb) => {
			if (!autoUpdaterMock._listeners[event]) { autoUpdaterMock._listeners[event] = []; }
			autoUpdaterMock._listeners[event].push(cb);
		}),
		// Helper to trigger events in tests
		emit: (event: GenericKey, ...args: unknown[]): void => {
			if (autoUpdaterMock._listeners[event]) {
				autoUpdaterMock._listeners[event].forEach(cb => cb(...args));
			}
		}
	};
	return {
		default: {
			autoUpdater: autoUpdaterMock
		}
	};
});

// Mock settings-service
vi.mock(`@core/settings-service.js`, () => ({
	get: vi.fn(),
	set: vi.fn(),
	save: vi.fn()
}));

// Mock semver
vi.mock(`semver`, () => ({
	default: {
		parse: vi.fn(v => v)
	}
}));



describe(`Update Service`, () => {
	let mockCtx: CoreContext;

	beforeEach(() => {
		vi.clearAllMocks();
		(autoUpdater as unknown as AutoUpdaterMock)._listeners = {};
		updateService.reset();

		mockCtx = {
			_appVersion: `1.2.3` as AppVersion,
			setMenu: vi.fn(),
			uiEvent: vi.fn(),
			$appWindow: { id: 1 as Count } as unknown
		} as unknown as CoreContext;
	});

	it(`should initialize with correct settings (allowBypassUpdates = false)`, () => {
		vi.mocked(settingsService.get).mockReturnValue(false);
		updateService.init(mockCtx);

		expect(autoUpdater.forceDevUpdateConfig).toBe(true);
		expect(autoUpdater.autoInstallOnAppQuit).toBe(true);
		expect(autoUpdater.logger).toBeNull();
		expect(autoUpdater.setFeedURL).toHaveBeenCalledWith(expect.objectContaining({
			owner: `cycosoft`,
			repo: `Eyas`
		}));
		expect(autoUpdater.checkForUpdates).toHaveBeenCalled();
	});

	it(`should initialize with allowBypassUpdates enabled`, () => {
		vi.mocked(settingsService.get).mockReturnValue(true);
		updateService.init(mockCtx);

		expect(autoUpdater.autoInstallOnAppQuit).toBe(false);
	});

	it(`should allow setting autoInstallOnAppQuit dynamically`, () => {
		updateService.init(mockCtx);
		updateService.setAutoInstallOnAppQuit(false);
		expect(autoUpdater.autoInstallOnAppQuit).toBe(false);

		updateService.setAutoInstallOnAppQuit(true);
		expect(autoUpdater.autoInstallOnAppQuit).toBe(true);
	});

	it(`should update status and refresh menu on update-available`, () => {
		updateService.init(mockCtx);

		// Trigger the event
		(autoUpdater as unknown as AutoUpdaterMock).emit(`update-available`);

		expect(updateService.getStatus()).toBe(`downloading`);
		expect(mockCtx.setMenu).toHaveBeenCalled();
	});

	it(`should update status and refresh menu on update-downloaded`, () => {
		updateService.init(mockCtx);

		// Trigger the event
		(autoUpdater as unknown as AutoUpdaterMock).emit(`update-downloaded`);

		expect(updateService.getStatus()).toBe(`downloaded`);
		expect(mockCtx.setMenu).toHaveBeenCalled();
	});

	it(`should show dialog if user-triggered check find no update`, () => {
		updateService.init(mockCtx);
		updateService.checkForUpdates();

		// Trigger update-not-available
		(autoUpdater as unknown as AutoUpdaterMock).emit(`update-not-available`);

		expect(mockCtx.uiEvent).toHaveBeenCalledWith(`show-no-update-modal`);
	});

	it(`should NOT show dialog if auto-check find no update`, () => {
		updateService.init(mockCtx);

		// Trigger update-not-available WITHOUT calling checkForUpdates() first
		(autoUpdater as unknown as AutoUpdaterMock).emit(`update-not-available`);

		expect(mockCtx.uiEvent).not.toHaveBeenCalledWith(`show-no-update-modal`);
	});

	it(`should quit and install when installUpdate is called`, () => {
		updateService.installUpdate();
		expect(autoUpdater.quitAndInstall).toHaveBeenCalled();
	});

	it(`should update status to error on update error`, () => {
		updateService.init(mockCtx);

		// Trigger the error event
		(autoUpdater as unknown as AutoUpdaterMock).emit(`error`, new Error(`Update failed`));

		expect(updateService.getStatus()).toBe(`error`);
		expect(mockCtx.uiEvent).toHaveBeenCalledWith(expect.anything(), `error`);
	});
});
