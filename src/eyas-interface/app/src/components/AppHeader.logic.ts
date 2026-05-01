import eyasLogo from '@/assets/eyas-logo.svg';
import type { NavGroup, NavItem, MnemonicPart, BrowserControl } from '@registry/components.js';

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
