import type { ViewportWidth, ViewportHeight, ViewportLabel, ChannelName, FilePath, DomainUrl, SettingKey, IsActive } from './primitives.js';
import type { Mixpanel } from 'mixpanel';


/** A viewport configuration for the browser window */
export type Viewport = {
	label: ViewportLabel;
	width: ViewportWidth;
	height: ViewportHeight;
	isDefault?: boolean;
}

/** Tuple representing viewport dimensions */
export type ViewportSize = [ViewportWidth, ViewportHeight];

/** Information about the configuration file to be loaded */
export type ConfigToLoad = {
	method?: string;
	path?: FilePath;
}

/** A modal event to be triggered on startup */
export type StartupModal = {
	eventName: ChannelName;
	args: unknown[];
}

/** Application-level settings stored in the settings service */
export type AppSettings = {
	lastSeenVersion?: string;
	[key: string]: unknown;
}

/** Settings related to the environment selection */
export type EnvironmentSettings = {
	alwaysChoose?: IsActive;
	lastChoice?: EnvironmentChoice;
	lastChoiceHash?: string;
}

/** A single environment choice saved in settings */
export type EnvironmentChoice = {
	url: DomainUrl;
	key?: SettingKey;
}

/** Event that can be prevented */
export type PreventableEvent = {
	preventDefault: () => void;
}

/** Function for focusing the UI with attempt tracking */
export type FocusUI = {
	(): void;
	attempts?: number;
}

/** Mixpanel tracking state attached to trackEvent */
export type TrackingState = {
	mixpanel?: Mixpanel;
	deviceId?: string;
}
