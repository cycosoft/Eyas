import eyasLogo from '@/assets/eyas-logo.svg';
import type { NavGroup, NavItem, MnemonicPart, BrowserControl } from '@registry/components.js';
import type { BrowserAction, IsActive, ChannelName } from '@registry/primitives.js';

/**
 * The navigation groups displayed in the application header.
 */
export const groups: NavGroup[] = [
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
		shortcut: `Alt+T`,
		submenu: [
			{ title: `Settings`, value: `settings`, shortcut: `Ctrl+,`, mnemonic: `S` },
			{ title: `Test Server`, value: `test-server`, mnemonic: `T` },
			{ title: `DevTools`, value: `devtools`, shortcut: `F12`, mnemonic: `D` }
		]
	}
];

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
