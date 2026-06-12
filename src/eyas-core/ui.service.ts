import type { CoreContext, UIService } from '@registry/eyas-core.js';
import type { IsActive, ChannelName } from '@registry/primitives.js';
import type { AppSettings, CredentialMetadata } from '@registry/core.js';
import * as settingsService from './settings-service.js';
import { EYAS_HEADER_HEIGHT } from '@scripts/constants.js';
import credentialStore from './credential-store.js';

/**
 * Service for managing the Eyas UI layer (overlay) and modal flows.
 */
export const uiService: UIService = {
	/**
	 * Toggles the Eyas UI layer so the user can interact with it or their test.
	 * @param ctx The core context.
	 * @param enable Whether to enable (show) or disable (hide) the UI layer.
	 */
	toggleEyasUI(ctx: CoreContext, enable: IsActive, forceImmediate: IsActive = false): void {
		// Guard: skip if $eyasLayer is absent or has already been destroyed by Electron
		// (e.g. when install-update closes $appWindow before a pending IPC fires).
		if (!ctx.$eyasLayer || ctx.$eyasLayer.webContents.isDestroyed()) { return; }

		if (enable) {
			// Restore the layer to full size, synced to the actual native window content dimensions.
			// This ensures the modal is centered and the scrim covers the full viewport without gaps.
			const appWindow = ctx.$appWindow;
			const [winWidth, winHeight] = (appWindow && !appWindow.isDestroyed())
				? appWindow.getContentSize()
				: [ctx.$currentViewport[0], ctx.$currentViewport[1] + EYAS_HEADER_HEIGHT];
			ctx.$eyasLayer.setBounds({
				x: 0,
				y: 0,
				width: winWidth,
				height: winHeight
			});

			// give the layer focus
			this.focusUI(ctx);

			// notify renderer that the layer has expanded
			ctx.$eyasLayer.webContents.send(`ui-shown`);
		} else {
			// close all modals in the UI
			ctx.$eyasLayer.webContents.send(`close-modals`);

			// if requested to shrink immediately OR if there are no animations to wait for
			// (we default to waiting for the renderer to send 'hide-ui' when it's ready)
			if (forceImmediate) {
				const appWindow = ctx.$appWindow;
				const [winWidth] = (appWindow && !appWindow.isDestroyed())
					? appWindow.getContentSize()
					: [ctx.$currentViewport[0]];
				ctx.$eyasLayer.setBounds({
					x: 0,
					y: 0,
					width: winWidth,
					height: EYAS_HEADER_HEIGHT
				});

				// notify renderer that the layer has collapsed
				ctx.$eyasLayer.webContents.send(`ui-hidden`);
			}
		}
	},

	/**
	 * Focuses the Eyas UI layer with a retry mechanism.
	 * @param ctx The core context.
	 */
	focusUI(ctx: CoreContext): void {
		if (ctx.$eyasLayer && !ctx.$eyasLayer.webContents.isDestroyed()) {
			ctx.$eyasLayer.webContents.focus();
		}
	},

	/**
	 * Request the UI layer to launch an event.
	 * @param ctx The core context.
	 * @param eventName The name of the event to trigger.
	 * @param args Arguments to pass to the event.
	 */
	uiEvent(ctx: CoreContext, eventName: ChannelName, ...args: unknown[]): void {
		// Guard: skip all UI events if $eyasLayer has been destroyed.
		if (!ctx.$eyasLayer || ctx.$eyasLayer.webContents.isDestroyed()) { return; }

		// List of events that are NOT modals and don't need UI expansion or buffering
		const nonModalEvents: ChannelName[] = [`update-status-updated` as ChannelName];

		if (nonModalEvents.includes(eventName)) {
			ctx.$eyasLayer.webContents.send(eventName, ...args);
			return;
		}

		// if the "What's New" modal is currently active, buffer this event
		// (Except for the "What's New" modal itself)
		if (ctx.$pendingStartupModal === null && eventName !== `show-whats-new`) {
			// if we haven't seen the current version, buffer the first modal request
			if (this.isWhatsNewRequired(ctx)) {
				ctx.setPendingStartupModal({ eventName, args });
				return;
			}
		}

		// display the UI layer
		this.toggleEyasUI(ctx, true);

		// send the interaction to the UI layer
		ctx.$eyasLayer.webContents.send(eventName, ...args);
	},

	/**
	 * Trigger any modal that was buffered during the startup sequence.
	 * @param ctx The core context.
	 */
	triggerBufferedModal(ctx: CoreContext): void {
		if (!ctx.$pendingStartupModal) { return; }

		// trigger the buffered modal event
		const { eventName, args } = ctx.$pendingStartupModal;
		ctx.setPendingStartupModal(null);
		this.uiEvent(ctx, eventName, ...args);
	},

	/**
	 * Check if the user needs to see the "What's New" modal on startup.
	 * @param ctx The core context.
	 */
	checkStartupSequence(ctx: CoreContext): void {
		if (this.isWhatsNewRequired(ctx)) {
			// request to show the "What's New" modal
			this.uiEvent(ctx, `show-whats-new`);
		} else {
			// if the modal is not needed, release any other modal that might have been buffered
			this.triggerBufferedModal(ctx);
		}
	},

	/**
	 * Single source of truth for whether the "What's New" modal is required.
	 * @param ctx The core context.
	 * @returns Whether the modal is required.
	 */
	isWhatsNewRequired(ctx: CoreContext): IsActive {
		// check if the user has requested to skip the "What's New" modal
		if (process.argv.includes(`--skip-whats-new`)) {
			return false;
		}

		const appSettings = settingsService.getAppSettings() as AppSettings | undefined;
		const lastSeenVersion = appSettings?.lastSeenVersion || `0.0.0`;
		return !!(ctx.$latestChangelogVersion && (ctx.$latestChangelogVersion !== lastSeenVersion));
	},

	/**
	 * Shows the settings modal with current project and app settings.
	 * @param ctx The core context.
	 */
	showSettings(ctx: CoreContext): void {
		const projectId = ctx.$config?.meta?.projectId;
		const triggerSettings = (credentials: CredentialMetadata[] = []): void => {
			this.uiEvent(ctx, `show-settings-modal`, {
				project: settingsService.getProjectSettings(projectId ?? undefined),
				app: settingsService.getAppSettings(),
				projectId: projectId || undefined,
				credentials
			});
		};

		if (projectId) {
			credentialStore.getAllCredentials(projectId)
				.then(credentials => triggerSettings(credentials))
				.catch(err => {
					console.error(`Failed to load credentials for settings:`, err);
					triggerSettings();
				});
		} else {
			triggerSettings();
		}
	},

	/**
	 * Tracks the number of attempts to focus the UI layer.
	 */
	focusAttempts: 0
};
