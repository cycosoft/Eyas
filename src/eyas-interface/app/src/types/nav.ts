/** A single item in a navigation group's submenu */
export type NavItem = {
	title: string;
	value: string;
};

/** A top-level navigation group with a dropdown submenu */
export type NavGroup = {
	name: string;
	submenu: NavItem[];
};
