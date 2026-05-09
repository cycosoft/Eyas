import type { IsActive, MenuLabel, MenuAccelerator, MetadataKey } from './primitives.js';

/** A single menu item descriptor */
type MenuItem = {
	label?: MenuLabel;
	type?: `normal` | `separator` | `submenu` | `checkbox` | `radio`;
	enabled?: IsActive;
	click?: () => void;
	submenu?: MenuItem[];
	accelerator?: MenuAccelerator;
	[key: MetadataKey]: unknown; // Allow other Electron-specific props
}

/** A full menu template array */
export type MenuTemplate = MenuItem[];

/** Context required to build the application menu */
export type MenuContext = {
	isDev: IsActive;
	testNetworkEnabled: IsActive;
	onOpenSettings?: () => void;
	onShowWhatsNew?: () => void;
	quit: () => void;
	navigateHome: () => void;
	reload: () => void;
	back: () => void;
	forward: () => void;
	toggleNetwork: () => void;
	isInitializing?: IsActive;
	isConfigLoaded?: IsActive;
	isEnvironmentPending?: IsActive;
}
