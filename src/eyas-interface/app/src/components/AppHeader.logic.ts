import { reactive, computed } from 'vue';
import useModalsStore from '@/stores/modals.js';
import type { NavGroup, NavItem, NavActivateEvent, PendingNavOpen, DisplayUrlInfo, CursorPosition } from '@registry/components.js';
import type { ChannelName, MenuLabel, ProjectId, DomainUrl, HashString, ListIndex } from '@registry/primitives.js';
import type { EnvironmentChoiceWithTitle } from '@registry/core.js';
import type { UpdateStatus } from '@registry/ipc.js';
import { handleNavItemClick, updateCache, updateTools, updateViewports, updateLinks } from './AppHeader.updates.js';
import type { NavigationStatePayload } from '@registry/ipc.js';

export * from './AppHeader.data.js';
export * from './AppHeader.navigation.js';
export * from './AppHeader.updates.js';

/**
 * The reactive state of the application header.
 */
export const state = reactive({
	menu: false,
	envMenu: false,
	tooltipVisible: false,
	cursorPos: [0, 0] as CursorPosition,
	activeGroup: null as MenuLabel | null,
	activator: undefined as Element | undefined,
	menuItems: [] as NavItem[],
	canGoBack: false,
	canGoForward: false,
	updateStatus: `idle` as UpdateStatus,
	currentUrl: ``,
	environments: [] as EnvironmentChoiceWithTitle[],
	currentEnvironment: null as DomainUrl | null,
	projectId: undefined as ProjectId | undefined,
	domainsHash: null as HashString | null,
	isHeaderHovered: false
});

/** The fallback delay (ms) to open the menu if the IPC event never fires. */
const RESIZE_FALLBACK_MS = 200;

let closeTimeout = -1;
let resizeFallback = -1;
let pendingOpen: PendingNavOpen | null = null;
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
		if (!state.isHeaderHovered && !state.menu && !state.envMenu && !modalsStore.hasVisibleModals) {
			window.eyas?.send(`hide-ui` as ChannelName);
		}
	}, 300);
}

/** Handles mouse enter on the entire app header. */
export function handleHeaderMouseEnter(): void {
	state.isHeaderHovered = true;
	window.clearTimeout(closeTimeout);
	window.eyas?.send(`show-ui` as ChannelName);
}

/** Handles mouse leave from the entire app header. */
export function handleHeaderMouseLeave(): void {
	state.isHeaderHovered = false;
	delayedClose();
}

/** Handles click on the URL to copy it to clipboard. */
export function handleUrlClick(): void {
	if (!displayUrlInfo.value.isFallback) {
		window.eyas?.send(`browser-copy-url` as ChannelName);
	}
}

/** Tracks the cursor's position for tooltip alignment. */
export function handleCursorMove(e: MouseEvent): void {
	state.cursorPos = [e.clientX + 10, e.clientY + 10];
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

/**
 * Computes the displayed URL text and fallback state.
 */
export const displayUrlInfo = computed<DisplayUrlInfo>(() => {
	const url = state.currentUrl;
	const isFallback = !url || url === `about:blank` || url.startsWith(`data:`);
	return {
		text: isFallback ? `Load a New Eyas to Get Started` : url,
		isFallback
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

	if (payload.currentUrl !== undefined) {
		state.currentUrl = payload.currentUrl;
	}

	if (payload.viewports && payload.currentViewport) {
		updateViewports(payload.viewports, payload.currentViewport[0], payload.currentViewport[1]);
	}

	if (payload.cacheSize !== undefined && payload.sessionAge !== undefined) {
		updateCache(payload.cacheSize, payload.sessionAge, !!payload.isDev);
	}

	if (payload.isDev !== undefined) {
		updateTools(!!payload.isDev);
	}

	if (payload.links) {
		updateLinks(payload.links);
	}

	if (payload.environments !== undefined) {
		state.environments = payload.environments;
	}

	if (payload.currentEnvironment !== undefined) {
		state.currentEnvironment = payload.currentEnvironment;
	}

	if (payload.projectId !== undefined) {
		state.projectId = payload.projectId;
	}

	if (payload.domainsHash !== undefined) {
		state.domainsHash = payload.domainsHash;
	}
}

/**
 * Computes the displayed environment title based on the active domain URL.
 */
export const activeEnvironmentTitle = computed(() => {
	if (!state.currentEnvironment) {
		return `SELECT ENV`;
	}
	const matched = state.environments.find(env => env.url === state.currentEnvironment);
	return matched ? matched.title : state.currentEnvironment;
});

/**
 * Selects an environment, saves preferences, and dispatches IPC actions to navigate.
 */
export function selectEnvironment(env: EnvironmentChoiceWithTitle, _index: ListIndex): void {
	const projectId = state.projectId ?? undefined;
	const domainCopy = JSON.parse(JSON.stringify(env));

	window.eyas?.send(`save-setting` as ChannelName, {
		key: `env.lastChoice`,
		value: domainCopy,
		projectId
	});

	if (state.domainsHash) {
		window.eyas?.send(`save-setting` as ChannelName, {
			key: `env.lastChoiceHash`,
			value: state.domainsHash,
			projectId
		});
	}

	window.eyas?.send(`environment-selected` as ChannelName, domainCopy);
}


