import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;
import semver from 'semver';
import { dialog } from 'electron';
import { getNoUpdateAvailableDialogOptions } from './update-dialog.js';
import type { UpdateService, CoreContext } from '@registry/eyas-core.js';
import type { UpdateStatus, IsActive } from '@registry/primitives.js';

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

		autoUpdater.on(`update-available`, () => {
			$updateStatus = `downloading`;
			ctx.setMenu();
		});

		autoUpdater.on(`update-downloaded`, () => {
			$updateStatus = `downloaded`;
			ctx.setMenu();
		});

		/** Handles showing a dialog if the user manually checked and no update was found */
		const showNoUpdateIfUserTriggered = (): void => {
			if ($updateCheckUserTriggered) {
				$updateCheckUserTriggered = false;
				if (ctx.$appWindow) {
					dialog.showMessageBox(ctx.$appWindow, getNoUpdateAvailableDialogOptions());
				}
			}
		};

		autoUpdater.on(`update-not-available`, showNoUpdateIfUserTriggered);

		autoUpdater.on(`error`, (err: Error) => {
			if (err.message?.includes(`404`)) {
				console.error(`Auto-update error: update server not found`);
			} else {
				console.error(`Auto-update error:`, err);
			}
			showNoUpdateIfUserTriggered();
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
