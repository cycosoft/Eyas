import eyasLogo from '@/assets/eyas-logo.svg';
import type { NavGroup, NavItem } from '@/types/nav.js';
import type { MenuLabel } from '@registry/primitives.js';

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
			{ title: `Recent Tests`, value: `recent-tests`, mnemonic: `R` },
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
 * Returns the name or title with the mnemonic character underlined.
 * @param item The navigation group or item to format.
 * @returns The formatted name string (HTML).
 */
export function getMnemonicName(item: NavGroup | NavItem): MenuLabel {
	const label = `name` in item ? item.name : item.title;
	let mnemonic = item.mnemonic?.toLowerCase();

	if (!mnemonic && item.shortcut?.startsWith(`Alt+`)) {
		mnemonic = item.shortcut.split(`+`)[1].toLowerCase();
	}

	if (!mnemonic) {
		return label as MenuLabel;
	}

	const index = label.toLowerCase().indexOf(mnemonic);

	if (index === -1) {
		return label as MenuLabel;
	}

	return `${label.slice(0, index)}<u>${label[index]}</u>${label.slice(index + 1)}` as MenuLabel;
}
