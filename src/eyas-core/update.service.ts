import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;
import semver from 'semver';
import { dialog } from 'electron';
import { getNoUpdateAvailableDialogOptions } from './update-dialog.js';
import type { UpdateService, CoreContext } from '@registry/eyas-core.js';
import type { UpdateStatus, IsActive, ChannelName } from '@registry/primitives.js';

let $updateStatus = `idle` as UpdateStatus;
let $updateCheckUserTriggered: IsActive = false;

/** Service for handling application updates */
export const updateService: UpdateService = {
	/**
	 * Initializes the auto-updater and sets up listeners.
	 * @param ctx The core context of the application.
	 */
	init: (ctx: CoreContext): void => {
		autoUpdater.forceDevUpdateConfig = true;

		// Spoof the current version for update testing (currentVersion is read-only)
		Object.defineProperty(autoUpdater, `currentVersion`, {
			get: () => semver.parse(ctx._appVersion),
			configurable: true
		});

		// Silence internal logging to prevent duplicate stack traces
		autoUpdater.logger = null;

		autoUpdater.setFeedURL({
			provider: `github`,
			owner: `cycosoft`,
			repo: `Eyas`
		});

		// Helper to broadcast status changes
		const broadcastStatus = (status: UpdateStatus): void => {
			$updateStatus = status;
			ctx.setMenu();
			ctx.uiEvent(`update-status-updated` as ChannelName, $updateStatus);
		};

		// Set up event listeners
		autoUpdater.on(`checking-for-update`, () => broadcastStatus(`checking`));
		autoUpdater.on(`update-available`, () => broadcastStatus(`downloading`));
		autoUpdater.on(`update-downloaded`, () => broadcastStatus(`downloaded`));

		autoUpdater.on(`update-not-available`, () => {
			broadcastStatus(`idle`);
			if ($updateCheckUserTriggered) {
				$updateCheckUserTriggered = false;
				if (ctx.$appWindow) {
					dialog.showMessageBox(ctx.$appWindow, getNoUpdateAvailableDialogOptions());
				}
			}
		});

		autoUpdater.on(`error`, (err: Error) => {
			console.error(`Auto-update error:`, err);
			broadcastStatus(`error`);
			$updateCheckUserTriggered = false;
		});

		autoUpdater.checkForUpdates().catch(() => { });
	},

	/** Triggers an update check, flagging it as user-triggered */
	checkForUpdates: (): void => {
		$updateCheckUserTriggered = true;
		autoUpdater.checkForUpdates().catch(() => { });
	},

	/** Quits the app and installs the downloaded update */
	installUpdate: (): void => {
		autoUpdater.quitAndInstall();
	},

	/** Returns the current update status */
	getStatus: (): UpdateStatus => $updateStatus,

	/** Resets the internal state of the service (primarily for testing) */
	reset: (): void => {
		$updateStatus = `idle`;
		$updateCheckUserTriggered = false;
	}
};
