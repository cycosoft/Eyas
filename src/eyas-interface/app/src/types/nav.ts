import type { MenuLabel, MenuAccelerator, IconName } from '@registry/primitives.js';

/** A single item in a navigation group's submenu */
export type NavItem = {
	title: MenuLabel;
	value: string;
	icon?: IconName;
	color?: string;
	shortcut?: MenuAccelerator;
	mnemonic?: string;
};

/** A top-level navigation group with a dropdown submenu */
export type NavGroup = {
	name: MenuLabel;
	logo?: string;
	submenu: NavItem[];
	shortcut?: MenuAccelerator;
	mnemonic?: string;
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
