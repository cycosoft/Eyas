import { computed } from 'vue';
import { state } from './AppHeader.logic.js';
import type { ChannelName } from '@registry/primitives.js';
import type { UpdateStatus } from '@registry/ipc.js';

let checkingStartTime = 0;
let statusTimeout = -1;
let pendingStatus: UpdateStatus | null = null;

/**
 * Handles update status changes from the main process.
 * @param status The new update status.
 */
export function handleUpdateStatusUpdate(status: UpdateStatus): void {
	window.clearTimeout(statusTimeout);

	if (status === `checking`) {
		state.updateStatus = status;
		checkingStartTime = Date.now();
		pendingStatus = null;
		return;
	}

	const MIN_CHECK_MS = 500;
	const elapsed = Date.now() - checkingStartTime;

	if (state.updateStatus === `checking` && elapsed < MIN_CHECK_MS) {
		pendingStatus = status;
		statusTimeout = window.setTimeout(() => {
			state.updateStatus = pendingStatus || status;
			pendingStatus = null;
		}, MIN_CHECK_MS - elapsed);
		return;
	}

	state.updateStatus = status;
	pendingStatus = null;
}

/** Handles a click event on the broadcast button. */
export function handleBroadcastClick(): void {
	if (state.updateStatus === `downloaded`) {
		window.eyas?.send(`request-update-ready-modal` as ChannelName);
		return;
	}

	if (state.updateStatus === `idle` || state.updateStatus === `error`) {
		window.eyas?.send(`check-for-updates` as ChannelName);
	}
}

export const updateInfo = computed(() => {
	if (state.updateStatus === `checking`) {
		return {
			icon: `mdi-progress-clock`,
			color: `primary`,
			title: `Checking for updates...`,
			disabled: true,
			variant: `text` as const,
			ripple: true
		};
	}

	if (state.updateStatus === `downloading`) {
		return {
			icon: `mdi-progress-download`,
			color: `primary`,
			title: `Downloading update...`,
			disabled: true,
			variant: `text` as const,
			ripple: true
		};
	}

	if (state.updateStatus === `downloaded`) {
		return {
			icon: `mdi-progress-alert`,
			color: `success`,
			title: `Update available - Click to restart`,
			disabled: false,
			variant: `text` as const,
			ripple: true
		};
	}

	if (state.updateStatus === `error`) {
		return {
			icon: `mdi-progress-close`,
			color: `error`,
			title: `Update check failed`,
			disabled: false,
			variant: `plain` as const,
			ripple: false
		};
	}

	return {
		icon: `mdi-progress-check`,
		color: undefined,
		disabled: false,
		variant: `plain` as const,
		ripple: false
	};
});
