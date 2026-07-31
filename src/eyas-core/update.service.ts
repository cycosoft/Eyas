import { app } from 'electron';
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;
import semver from 'semver';
import _path from 'path';
import type { UpdateService, CoreContext } from '@registry/eyas-core.js';
import type { UpdateStatus, IsActive, ChannelName, FilePath } from '@registry/primitives.js';
import * as settingsService from './settings-service.js';
import { isLockHeldByLiveProcess, acquireLock } from './process-lock-utils.js';

/** Test-only escape hatch — redirect the update-check lock file to a temp path. */
let _lockPathOverride: FilePath | null = null;
function _setLockPathOverride(p: FilePath | null): void {
	_lockPathOverride = p;
}

/** Fixed (non-testId-scoped) lock so concurrent Eyas instances don't all download into the shared electron-updater cache dir at once (EYAS-334). Best-effort: if acquisition fails for any reason, this instance just skips its own auto-check rather than blocking startup. */
function _updateLockPath(): FilePath {
	return _lockPathOverride ?? (_path.join(app.getPath(`userData`), `update-check.lock`) as FilePath);
}

let $updateStatus = `idle` as UpdateStatus;
let $updateCheckUserTriggered: IsActive = false;

/** Test-only handle on the in-flight gated auto-check kicked off by init(), so tests can await it instead of guessing at microtask timing. */
let _pendingAutoCheck: Promise<void> = Promise.resolve();
function _awaitPendingAutoCheck(): Promise<void> {
	return _pendingAutoCheck;
}

/** Service for handling application updates */
export const updateService: UpdateService = {
	/**
	 * Initializes the auto-updater and sets up listeners.
	 * @param ctx The core context of the application.
	 */
	init: (ctx: CoreContext): void => {
		autoUpdater.forceDevUpdateConfig = true;
		const allowBypassSetting = settingsService.get(`allowBypassUpdates`) as IsActive;
		autoUpdater.autoInstallOnAppQuit = !allowBypassSetting;

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
				ctx.uiEvent(`show-no-update-modal` as ChannelName);
			}
		});

		autoUpdater.on(`error`, (err: Error) => {
			console.error(`Auto-update error:`, err);
			broadcastStatus(`error`);
			$updateCheckUserTriggered = false;
		});

		_pendingAutoCheck = (async (): Promise<void> => {
			try {
				const lockPath = _updateLockPath();
				const alreadyChecking = await isLockHeldByLiveProcess(lockPath);
				if (alreadyChecking) { return; }

				await acquireLock(lockPath);
				await autoUpdater.checkForUpdates();
			} catch {
				// best-effort — a failed/skipped auto-check on startup is not fatal
			}
		})();
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
	},

	/** Updates the autoInstallOnAppQuit setting dynamically */
	setAutoInstallOnAppQuit: (enabled: IsActive): void => {
		autoUpdater.autoInstallOnAppQuit = enabled;
	},

	_setLockPathOverride,
	_awaitPendingAutoCheck
};
