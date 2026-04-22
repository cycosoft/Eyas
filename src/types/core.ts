import type { ViewportWidth, ViewportHeight, ViewportLabel, ChannelName, FilePath, DomainUrl, SettingKey, IsActive, IsDefault, LoadMethod, AppVersion, HashString, AppTitle } from './primitives.js';


/** A viewport configuration for the browser window */
export type Viewport = {
	label: ViewportLabel;
	width: ViewportWidth;
	height: ViewportHeight;
	isDefault?: IsDefault;
}

/** Tuple representing viewport dimensions */
export type ViewportSize = [ViewportWidth, ViewportHeight];

/** Information about the configuration file to be loaded */
export type ConfigToLoad = {
	method?: LoadMethod;
	path?: FilePath;
}

/** A modal event to be triggered on startup */
export type StartupModal = {
	eventName: ChannelName;
	args: unknown[];
}

/** Application-level settings stored in the settings service */
export type AppSettings = {
	lastSeenVersion?: AppVersion;
	[key: SettingKey]: unknown;
}

/** Settings related to the environment selection */
export type EnvironmentSettings = {
	alwaysChoose?: IsActive;
	lastChoice?: EnvironmentChoice;
	lastChoiceHash?: HashString;
}

/** Settings related to the local test server */
export type TestServerSettings = {
	useHttps?: IsActive;
	autoOpenBrowser?: IsActive;
	useCustomDomain?: IsActive;
}

/** A single environment choice saved in settings */
export type EnvironmentChoice = {
	url: DomainUrl;
	key?: SettingKey;
}

/** A single environment choice with a title */
export type EnvironmentTitle = {
	title?: AppTitle;
}

export type EnvironmentChoiceWithTitle = EnvironmentChoice & EnvironmentTitle;

/** Event that can be prevented */
export type PreventableEvent = {
	preventDefault: () => void;
}



