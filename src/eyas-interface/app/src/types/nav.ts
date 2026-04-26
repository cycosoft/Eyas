/** A single item in a navigation group's submenu */
export type NavItem = {
	title: string;
	value: string;
};

/** A top-level navigation group with a dropdown submenu */
export type NavGroup = {
	name: string;
	logo?: string;
	submenu: NavItem[];
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
