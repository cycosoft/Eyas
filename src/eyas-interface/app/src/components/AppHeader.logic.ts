import { reactive, computed } from 'vue';
import useModalsStore from '@/stores/modals.js';
import type { NavGroup, NavItem, NavActivateEvent, PendingNavOpen } from '@registry/components.js';
import type { ChannelName, MenuLabel } from '@registry/primitives.js';
import type { UpdateStatus } from '@registry/ipc.js';
import { handleNavItemClick, updateCache, updateTools, updateViewports } from './AppHeader.updates.js';
import type { NavigationStatePayload } from '@registry/ipc.js';

export * from './AppHeader.data.js';
export * from './AppHeader.navigation.js';
export * from './AppHeader.updates.js';

/**
 * The reactive state of the application header.
 */
export const state = reactive({
	menu: false,
	activeGroup: null as MenuLabel | null,
	activator: undefined as Element | undefined,
	menuItems: [] as NavItem[],
	canGoBack: false,
	canGoForward: false,
	updateStatus: `idle` as UpdateStatus
});

/** The fallback delay (ms) to open the menu if the IPC event never fires. */
const RESIZE_FALLBACK_MS = 200;

let closeTimeout = -1;
let resizeFallback = -1;
let pendingOpen: PendingNavOpen | null = null;

/** Handles a click event on the broadcast button. */
export function handleBroadcastClick(): void {
	if (state.updateStatus === `downloaded`) {
		window.eyas?.send(`install-update` as ChannelName);
		return;
	}

	if (state.updateStatus === `idle`) {
		window.eyas?.send(`check-for-updates` as ChannelName);
	}
}


/** Opens the navigation menu for a specific group. */
function openMenu(targetEl: Element, group: NavGroup): void {
	state.activator = targetEl;
	state.menuItems = group.submenu;
	state.activeGroup = group.name;
	state.menu = true;
}

/** Confirms that the UI layer has expanded and opens the pending menu. */
export function triggerOpen(): void {
	if (!pendingOpen) { return; }
	window.clearTimeout(resizeFallback);
	openMenu(pendingOpen.target, pendingOpen.group);
	pendingOpen = null;
}

/**
 * Activates a navigation group, expanding the UI layer if necessary.
 * @param event The activation event (click).
 * @param group The navigation group to activate.
 */
export function activate(event: NavActivateEvent, group: NavGroup): void {
	const target = event.currentTarget;

	if (state.menu) {
		if (state.activator === target) {
			state.menu = false;
			return;
		}
		openMenu(target, group);
	} else {
		pendingOpen = { target, group };
		window.eyas?.send(`show-ui` as ChannelName);

		window.clearTimeout(resizeFallback);
		resizeFallback = window.setTimeout(triggerOpen, RESIZE_FALLBACK_MS);
	}
}

/**
 * Handles mouse enter events for navigation groups.
 * @param event The mouse enter event.
 * @param group The navigation group.
 */
export function onMouseEnter(event: NavActivateEvent, group: NavGroup): void {
	if (state.menu && state.activator !== event.currentTarget) {
		openMenu(event.currentTarget, group);
	}
}

/**
 * Handles a click event on a navigation menu item.
 * @param item The clicked item.
 */
export function onItemClick(item: NavItem): void {
	if (item.click) {
		item.click();
	} else {
		handleNavItemClick(item.value);
	}

	if (!item.submenu) {
		state.menu = false;
	}
}

/** Closes the UI layer after a delay, if no menus or modals are open. */
export function delayedClose(): void {
	const modalsStore = useModalsStore();
	window.clearTimeout(closeTimeout);

	closeTimeout = window.setTimeout(() => {
		if (!state.menu && !modalsStore.hasVisibleModals) {
			window.eyas?.send(`hide-ui` as ChannelName);
		}
	}, 300);
}

export const updateInfo = computed(() => {
	if (state.updateStatus === `checking`) {
		return {
			icon: `mdi-progress-clock`,
			color: `primary`,
			title: `Checking for updates...`,
			disabled: true
		};
	}

	if (state.updateStatus === `downloading`) {
		return {
			icon: `mdi-progress-download`,
			color: `primary`,
			title: `Downloading update...`,
			disabled: true
		};
	}

	if (state.updateStatus === `downloaded`) {
		return {
			icon: `mdi-progress-alert`,
			color: `warning`,
			title: `Update available - Click to restart`,
			disabled: false
		};
	}

	if (state.updateStatus === `error`) {
		return {
			icon: `mdi-progress-close`,
			color: `error`,
			title: `Update check failed`,
			disabled: false
		};
	}

	return {
		icon: `mdi-progress-check`,
		color: undefined,
		disabled: false
	};
});

/**
 * Handles navigation state updates from the main process.
 * @param data The navigation state payload.
 */
export function handleNavigationUpdate(data: unknown): void {
	const payload = data as NavigationStatePayload;
	state.canGoBack = payload.canGoBack;
	state.canGoForward = payload.canGoForward;

	if (payload.viewports && payload.currentViewport) {
		updateViewports(payload.viewports, payload.currentViewport[0], payload.currentViewport[1]);
	}

	if (payload.cacheSize !== undefined && payload.sessionAge !== undefined) {
		updateCache(payload.cacheSize, payload.sessionAge, !!payload.isDev);
	}

	if (payload.isDev !== undefined) {
		updateTools(!!payload.isDev);
	}
}

/**
 * Handles update status changes from the main process.
 * @param status The new update status.
 */
export function handleUpdateStatusUpdate(status: UpdateStatus): void {
	state.updateStatus = status;
}
