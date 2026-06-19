import type { MenuLabel, IconName, MenuAccelerator, IsActive, BrowserAction } from './primitives.js';

/** A semantic value for a navigation item */
export type NavItemValue = string;

/** A semantic handler for a navigation action */
export type ActionHandler = () => void;

/** A single item in a navigation group's submenu */
export type NavItem = {
	title: MenuLabel;
	value: NavItemValue;
	icon?: IconName;
	appendIcon?: IconName;
	divider?: boolean;
	color?: string;
	shortcut?: MenuAccelerator;
	mnemonic?: string;
	mnemonicParts?: MnemonicPart[];
	selected?: IsActive;
	submenu?: NavItem[];
	click?: () => void;
	actionable?: boolean;
};

/** A top-level navigation group with a dropdown submenu */
export type NavGroup = {
	name: MenuLabel;
	title?: string;
	logo?: string;
	submenu: NavItem[];
	shortcut?: MenuAccelerator;
	mnemonic?: string;
	mnemonicParts?: MnemonicPart[];
};

/** A single part of a mnemonic-enabled label */
export type MnemonicPart = {
	text: string;
	isMnemonic: boolean;
};

/** A single browser control button */
export type BrowserControl = {
	icon: IconName;
	action: BrowserAction;
	label: string;
};

/** Data for a navigation group that is waiting to be opened */
export type PendingNavOpen = {
	target: Element;
	group: NavGroup;
};

/** Event payload for navigation group activation */
export type NavActivateEvent = {
	currentTarget: Element;
};

/** Information computed for the URL display in the central Omni-Hub bar. */
export type DisplayUrlInfo = {
	text: string;
	isFallback: boolean;
	isSecure: boolean;
};

/** The [x, y] screen coordinates of the user's cursor. */
export type CursorPosition = [x: number, y: number];

/**
 * Type helper for the AppHeader Vue component's ViewModel in tests.
 */
export type AppHeaderVM = {
	menu: boolean;
	envMenu: boolean;
	tooltipVisible: boolean;
	tooltipText: string;
	cursorPos: CursorPosition;
	menuItems: NavItem[];
	activator: Element | undefined;
	groups: NavGroup[];
	browserControls: BrowserControl[];
	canGoBack: boolean;
	canGoForward: boolean;
	activate: (event: NavActivateEvent, group: NavGroup) => void;
	onMouseEnter: (event: NavActivateEvent, group: NavGroup) => void;
	onItemClick: (item: NavItem) => void;
	onBrowserControlClick: (action: BrowserAction) => void;
	goBack: () => void;
	goForward: () => void;
	reload: () => void;
	goHome: () => void;
	handleHeaderMouseEnter: () => void;
	handleHeaderMouseLeave: () => void;
	handleUrlClick: () => void;
	resetTooltipText: () => void;
	$nextTick: () => Promise<void>;
	displayUrlInfo: DisplayUrlInfo;
	appTitle: string;
	displayAppTitle: string;
};
