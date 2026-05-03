import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateService } from '@core/update.service.js';
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;
import { dialog } from 'electron';
import type { CoreContext } from '@registry/eyas-core.js';
import type { GenericKey, AppVersion, Count } from '@registry/primitives.js';

/** Any function type for mocking */
type AnyFunction = (...args: unknown[]) => unknown;

/** Map of event listeners for the mock auto-updater */
type EventListenerMap = Record<GenericKey, AnyFunction[]>;

/** Type for triggering events on the mock auto-updater */
type AutoUpdaterMock = {
	emit: (event: GenericKey, ...args: unknown[]) => void;
};

// Mock electron-updater
vi.mock(`electron-updater`, () => {
	const listeners: EventListenerMap = {};
	return {
		default: {
			autoUpdater: {
				forceDevUpdateConfig: false,
				logger: {},
				setFeedURL: vi.fn(),
				checkForUpdates: vi.fn().mockResolvedValue({}),
				quitAndInstall: vi.fn(),
				on: vi.fn((event, cb) => {
					if (!listeners[event]) { listeners[event] = []; }
					listeners[event].push(cb);
				}),
				// Helper to trigger events in tests
				emit: (event: GenericKey, ...args: unknown[]): void => {
					if (listeners[event]) {
						listeners[event].forEach(cb => cb(...args));
					}
				}
			}
		}
	};
});

// Mock semver
vi.mock(`semver`, () => ({
	default: {
		parse: vi.fn(v => v)
	}
}));

// Mock electron dialog
vi.mock(`electron`, () => ({
	dialog: {
		showMessageBox: vi.fn()
	}
}));

// Mock update-dialog.js
vi.mock(`./update-dialog.js`, () => ({
	getNoUpdateAvailableDialogOptions: vi.fn(() => ({ message: `No update` }))
}));

describe(`Update Service`, () => {
	let mockCtx: CoreContext;

	beforeEach(() => {
		vi.clearAllMocks();
		updateService.reset();

		mockCtx = {
			_appVersion: `1.2.3` as AppVersion,
			setMenu: vi.fn(),
			uiEvent: vi.fn(),
			$appWindow: { id: 1 as Count } as unknown
		} as unknown as CoreContext;
	});

	it(`should initialize with correct settings`, () => {
		updateService.init(mockCtx);

		expect(autoUpdater.forceDevUpdateConfig).toBe(true);
		expect(autoUpdater.logger).toBeNull();
		expect(autoUpdater.setFeedURL).toHaveBeenCalledWith(expect.objectContaining({
			owner: `cycosoft`,
			repo: `Eyas`
		}));
		expect(autoUpdater.checkForUpdates).toHaveBeenCalled();
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

		expect(dialog.showMessageBox).toHaveBeenCalled();
	});

	it(`should NOT show dialog if auto-check find no update`, () => {
		updateService.init(mockCtx);

		// Trigger update-not-available WITHOUT calling checkForUpdates() first
		(autoUpdater as unknown as AutoUpdaterMock).emit(`update-not-available`);

		expect(dialog.showMessageBox).not.toHaveBeenCalled();
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
