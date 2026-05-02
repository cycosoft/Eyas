import eyasLogo from '@/assets/eyas-logo.svg';
import { reactive } from 'vue';
import type { NavGroup, NavItem, MnemonicPart, BrowserControl, NavItemValue, ActionHandler } from '@registry/components.js';
import { formatBytes } from '@/utils/format.utils.js';
import type { BrowserAction, IsActive, ChannelName, ViewportWidth, ViewportHeight, ByteCount, DurationString } from '@registry/primitives.js';
import type { Viewport } from '@registry/core.js';

/**
 * The navigation groups displayed in the application header.
 */
export const groups = reactive<NavGroup[]>([
	{
		name: `File`,
		logo: eyasLogo,
		shortcut: `Alt+F`,
		submenu: [
			{ title: `About Eyas`, value: `about`, icon: `mdi-information-outline`, mnemonic: `A` },
			{ title: `App/Project Settings`, value: `settings`, icon: `mdi-cog`, mnemonic: `S` },
			{ title: `Changelog`, value: `changelog`, icon: `mdi-history`, mnemonic: `C` },
			{ title: `Exit`, value: `exit`, icon: `mdi-power`, color: `error`, shortcut: `Ctrl+Q`, mnemonic: `x` }
		]
	},
	{
		name: `Tools`,
		title: `Technical Tools`,
		shortcut: `Alt+T`,
		submenu: [
			{ title: `Live Test Server`, value: `test-server`, icon: `mdi-earth`, mnemonic: `T` },
			{ title: `divider`, value: `divider-1`, divider: true },
			{ title: `Viewport`, value: `viewport`, icon: `mdi-aspect-ratio`, appendIcon: `mdi-chevron-right`, mnemonic: `V` },
			{ title: `divider`, value: `divider-2`, divider: true },
			{ title: `Cache`, value: `cache`, icon: `mdi-flash`, appendIcon: `mdi-chevron-right`, mnemonic: `C`, submenu: [] },
			{ title: `divider`, value: `divider-3`, divider: true },
			{ title: `Developer Tools (UI)`, value: `devtools-ui`, icon: `mdi-view-grid`, mnemonic: `U` },
			{ title: `Developer Tools (Test)`, value: `devtools-test`, icon: `mdi-flask`, shortcut: `F12`, mnemonic: `D` }
		]
	}
]);

/**
 * The browser controls displayed in the application header.
 */
export const browserControls: BrowserControl[] = [
	{ icon: `mdi-arrow-left`, action: `back`, label: `Back` },
	{ icon: `mdi-arrow-right`, action: `forward`, label: `Forward` },
	{ icon: `mdi-refresh`, action: `reload`, label: `Reload` },
	{ icon: `mdi-home`, action: `home`, label: `Home` }
];

/**
 * Returns the name or title split into parts for mnemonic underlining.
 * @param item The navigation group or item to format.
 * @returns The parts of the name string.
 */
function getMnemonicParts(item: NavGroup | NavItem): MnemonicPart[] {
	const label = `name` in item ? item.name : item.title;
	let mnemonic = item.mnemonic?.toLowerCase();

	if (!mnemonic && item.shortcut?.startsWith(`Alt+`)) {
		mnemonic = item.shortcut.split(`+`)[1].toLowerCase();
	}

	if (!mnemonic) {
		return [{ text: label, isMnemonic: false }];
	}

	const index = label.toLowerCase().indexOf(mnemonic);

	if (index === -1) {
		return [{ text: label, isMnemonic: false }];
	}

	const parts: MnemonicPart[] = [];

	if (index > 0) {
		parts.push({ text: label.slice(0, index), isMnemonic: false });
	}

	parts.push({ text: label[index], isMnemonic: true });

	if (index < label.length - 1) {
		parts.push({ text: label.slice(index + 1), isMnemonic: false });
	}

	return parts;
}

// Pre-calculate mnemonic parts for all static navigation groups and items
for (const group of groups) {
	group.mnemonicParts = getMnemonicParts(group);
	for (const item of group.submenu) {
		item.mnemonicParts = getMnemonicParts(item);
	}
}

/**
 * Checks if a browser control should be disabled based on the current stack state.
 * @param action The browser action to check.
 * @param canGoBack Whether the back stack is non-empty.
 * @param canGoForward Whether the forward stack is non-empty.
 * @returns True if the control should be disabled.
 */
export function isControlDisabled(action: BrowserAction, canGoBack: IsActive, canGoForward: IsActive): IsActive {
	if (action === `back`) { return !canGoBack; }
	if (action === `forward`) { return !canGoForward; }
	return false;
}

/**
 * Navigates the test layer back in history.
 */
export function goBack(): void {
	window.eyas?.send(`browser-back` as ChannelName);
}

/**
 * Navigates the test layer forward in history.
 */
export function goForward(): void {
	window.eyas?.send(`browser-forward` as ChannelName);
}

/**
 * Reloads the current page in the test layer.
 */
export function reload(): void {
	window.eyas?.send(`browser-reload` as ChannelName);
}

/**
 * Navigates the test layer to the test home page.
 */
export function goHome(): void {
	window.eyas?.send(`browser-home` as ChannelName);
}

/**
 * Handles a click event on a browser control button.
 * @param action The action to perform.
 * @param handlers Handlers for each navigation action.
 */
export function handleBrowserControlClick(action: BrowserAction): void {
	const actions: Record<BrowserAction, () => void> = {
		back: goBack,
		forward: goForward,
		reload,
		home: goHome
	};

	actions[action]?.();
}

/**
 * Handles a click event on a navigation menu item.
 * @param value The value of the clicked item.
 */
export function handleNavItemClick(value: NavItemValue): void {
	if (value.startsWith(`set-viewport:`)) {
		const [, width, height] = value.split(`:`);
		setViewport(Number(width), Number(height));
		return;
	}

	const actions: Record<NavItemValue, ActionHandler> = {
		about: () => { window.eyas?.send(`show-about` as ChannelName); },
		'test-server': () => { window.eyas?.send(`show-test-server-setup` as ChannelName); },
		settings: () => { window.eyas?.send(`show-settings` as ChannelName); },
		'whats-new': () => { window.eyas?.send(`show-whats-new` as ChannelName, true); },
		changelog: () => { window.eyas?.send(`show-whats-new` as ChannelName, true); },
		exit: () => { window.eyas?.send(`request-exit` as ChannelName); },
		'devtools-ui': () => { window.eyas?.send(`open-devtools-ui` as ChannelName); },
		'devtools-test': () => { window.eyas?.send(`open-devtools-test` as ChannelName); },
		'clear-cache': () => { window.eyas?.send(`clear-cache` as ChannelName); },
		'open-cache-folder': () => { window.eyas?.send(`open-cache-folder` as ChannelName); }
	};

	actions[value]?.();
}

/**
 * Updates the viewport submenu items based on the provided viewports.
 * @param viewports The list of available viewports.
 * @param currentWidth The current viewport width.
 * @param currentHeight The current viewport height.
 */
export function updateViewports(viewports: Viewport[], currentWidth: ViewportWidth, currentHeight: ViewportHeight): void {
	const toolsGroup = groups.find(g => g.name === `Tools`);
	if (!toolsGroup) { return; }

	const viewportItem = toolsGroup.submenu.find(i => i.value === `viewport`);
	if (!viewportItem) { return; }

	const submenu: NavItem[] = [];

	// Add "Current" item if it doesn't match any in the list (with some tolerance)
	const tolerance = 2;
	const isMatched = viewports.some(v => Math.abs(v.width - currentWidth) <= tolerance && Math.abs(v.height - currentHeight) <= tolerance);

	if (!isMatched) {
		submenu.push({
			title: `Current (${currentWidth} x ${currentHeight})`,
			value: `set-viewport:${currentWidth}:${currentHeight}`,
			icon: `mdi-crop-free`,
			selected: true,
			click: () => setViewport(currentWidth, currentHeight)
		});
		submenu.push({ title: `divider`, value: `viewport-divider-current`, divider: true });
	}

	// Add all viewports
	viewports.forEach((v, index) => {
		const isSelected = Math.abs(v.width - currentWidth) <= tolerance && Math.abs(v.height - currentHeight) <= tolerance;

		// Add separator before defaults if they aren't the first items
		if (v.isDefault && index > 0 && !viewports[index - 1].isDefault) {
			submenu.push({ title: `divider`, value: `viewport-divider-${index}`, divider: true });
		}

		submenu.push({
			title: `${v.label} (${v.width} x ${v.height})`,
			value: `set-viewport:${v.width}:${v.height}`,
			icon: v.isDefault ? `mdi-devices` : `mdi-cellphone-link`,
			selected: isSelected,
			click: () => setViewport(v.width, v.height)
		});
	});

	// Pre-calculate mnemonic parts for the new submenu items
	for (const item of submenu) {
		item.mnemonicParts = getMnemonicParts(item);
	}

	viewportItem.submenu = submenu;
}

/**
 * Sets the application viewport to the specified dimensions.
 * @param width The target width.
 * @param height The target height.
 */
function setViewport(width: ViewportWidth, height: ViewportHeight): void {
	window.eyas?.send(`set-viewport` as ChannelName, [width, height]);
}

/**
 * Updates the cache submenu items based on the provided cache info.
 * @param cacheSize The current cache size in bytes.
 * @param sessionAge The current session age string.
 * @param isDev Whether the application is running in development mode.
 */
export function updateCache(cacheSize: ByteCount, sessionAge: DurationString, isDev: IsActive): void {
	const toolsGroup = groups.find(g => g.name === `Tools`);
	if (!toolsGroup) { return; }

	const cacheItem = toolsGroup.submenu.find(i => i.value === `cache`);
	if (!cacheItem) { return; }

	const submenu: NavItem[] = [
		{ title: `Age: ${sessionAge}`, value: `cache-age`, icon: `mdi-clock-outline`, actionable: false },
		{ title: `Size: ${formatBytes(cacheSize)}`, value: `cache-size`, icon: `mdi-database-outline`, actionable: false },
		{ title: `divider`, value: `cache-divider-1`, divider: true },
		{ title: `Clear`, value: `clear-cache`, icon: `mdi-delete-sweep`, mnemonic: `C` }
	];

	if (isDev) {
		submenu.push({ title: `Open Cache Folder`, value: `open-cache-folder`, icon: `mdi-folder-open`, mnemonic: `O` });
	}

	// Pre-calculate mnemonic parts for the new submenu items
	for (const item of submenu) {
		item.mnemonicParts = getMnemonicParts(item);
	}

	cacheItem.submenu = submenu;
}
