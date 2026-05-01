import eyasLogo from '@/assets/eyas-logo.svg';
import type { NavGroup, NavItem, MnemonicPart } from '@registry/components.js';

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
			{ title: `Exit`, value: `exit`, icon: `mdi-power`, color: `error`, shortcut: `Ctrl+Q`, mnemonic: `x` }
		]
	},
	{
		name: `View`,
		shortcut: `Alt+V`,
		submenu: [
			{ title: `Zoom In`, value: `zoom-in`, shortcut: `Ctrl+=`, mnemonic: `I` },
			{ title: `Zoom Out`, value: `zoom-out`, shortcut: `Ctrl+-`, mnemonic: `O` },
			{ title: `Reset Zoom`, value: `reset-zoom`, shortcut: `Ctrl+0`, mnemonic: `R` },
			{ title: `Full Screen`, value: `full-screen`, shortcut: `F11`, mnemonic: `F` }
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
	},
	{
		name: `Help`,
		shortcut: `Alt+H`,
		submenu: [
			{ title: `What's New`, value: `whats-new`, mnemonic: `W` },
			{ title: `Documentation`, value: `docs`, mnemonic: `D` },
			{ title: `Report an Issue`, value: `report-issue`, mnemonic: `I` }
		]
	}
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
