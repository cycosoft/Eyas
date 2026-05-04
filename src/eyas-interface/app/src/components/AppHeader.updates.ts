import { groups, getMnemonicParts } from './AppHeader.data.js';
import type { NavItem, NavItemValue, ActionHandler } from '@registry/components.js';
import { formatBytes } from '@/utils/format.utils.js';
import type { ChannelName, ViewportWidth, ViewportHeight, ByteCount, DurationString, IsActive } from '@registry/primitives.js';
import type { Viewport } from '@registry/core.js';

/**
 * Handles a click event on a navigation menu item.
 * @param value The value of the clicked item.
 */
export function handleNavItemClick(value: NavItemValue): void {
	if (value.startsWith(`launch-link:`)) {
		const payload = JSON.parse(value.replace(`launch-link:`, ``));
		window.eyas?.send(`launch-link` as ChannelName, payload);
		return;
	}

	if (value.startsWith(`launch-link-var:`)) {
		const url = value.replace(`launch-link-var:`, ``);
		window.eyas?.send(`launch-link-variable` as ChannelName, url);
		return;
	}

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

	viewports.forEach((v, index) => {
		const isSelected = Math.abs(v.width - currentWidth) <= tolerance && Math.abs(v.height - currentHeight) <= tolerance;

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

	for (const item of submenu) {
		item.mnemonicParts = getMnemonicParts(item);
	}

	viewportItem.submenu = submenu;
}

/** Sets the application viewport to the specified dimensions. */
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

	for (const item of submenu) {
		item.mnemonicParts = getMnemonicParts(item);
	}

	cacheItem.submenu = submenu;
}

/**
 * Updates the Tools menu items based on the application state.
 * @param isDev Whether the application is running in development mode.
 */
export function updateTools(isDev: IsActive): void {
	const toolsGroup = groups.find(g => g.name === `Tools`);
	if (!toolsGroup) { return; }

	const devToolsUiIndex = toolsGroup.submenu.findIndex(i => i.value === `devtools-ui`);

	if (isDev) {
		if (devToolsUiIndex === -1) {
			const devToolsTestIndex = toolsGroup.submenu.findIndex(i => i.value === `devtools-test`);
			const insertIndex = devToolsTestIndex === -1 ? toolsGroup.submenu.length : devToolsTestIndex;

			toolsGroup.submenu.splice(insertIndex, 0, {
				title: `Developer Tools (Eyas)`,
				value: `devtools-ui`,
				icon: `mdi-view-grid`,
				mnemonic: `U`
			});

			const newItem = toolsGroup.submenu[insertIndex];
			newItem.mnemonicParts = getMnemonicParts(newItem);
		}
	} else {
		if (devToolsUiIndex !== -1) {
			toolsGroup.submenu.splice(devToolsUiIndex, 1);
		}
	}
}

/**
 * Updates the Links menu items based on the provided links.
 * @param links The list of serializable links.
 */
export function updateLinks(links: NavItem[]): void {
	const linksGroup = groups.find(g => g.name === `Links`);
	if (!linksGroup) { return; }

	linksGroup.submenu = links;

	for (const item of linksGroup.submenu) {
		item.mnemonicParts = getMnemonicParts(item);
	}
}
