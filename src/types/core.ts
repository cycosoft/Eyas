import type { ViewportWidth, ViewportHeight, ViewportLabel, ChannelName, FilePath, DomainUrl, SettingKey, IsActive, IsDefault, LoadMethod, AppVersion, HashString, AppTitle, ScreenCoordinate, PixelDimension, ProjectId, Username, PasswordPlain, PasswordHex } from './primitives.js';

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
type EnvironmentTitle = {
	title?: AppTitle;
}

export type EnvironmentChoiceWithTitle = EnvironmentChoice & EnvironmentTitle;

/** Event that can be prevented */
export type PreventableEvent = {
	preventDefault: () => void;
}

/** A rectangle representing a view's bounds */
export type Rectangle = {
	x: ScreenCoordinate;
	y: ScreenCoordinate;
	width: PixelDimension;
	height: PixelDimension;
};

/** A record containing credential details for an origin */
type CredentialRecord = {
	username: Username;
	passwordHex: PasswordHex; // Encrypted password stored as hex
};

/** A record containing decrypted credential details */
export type DecryptedCredential = {
	username: Username;
	passwordPlain: PasswordPlain;
};

/** A record representing original credentials input before hover preview */
export type CredentialBackup = {
	username: Username;
	password: PasswordPlain;
};

/** Data structure containing all stored credentials, indexed by projectId and then origin */
export type CredentialStoreData = Record<ProjectId, Record<DomainUrl, CredentialRecord[]>>;

/** A record representing basic credential metadata (excluding password) */
export type CredentialMetadata = {
	origin: DomainUrl;
	username: Username;
};

/** Service for securely storing and retrieving credentials asynchronously */
export type CredentialStoreService = {
	saveCredential: (projectId: ProjectId, origin: DomainUrl, username: Username, passwordPlain: PasswordPlain) => Promise<void>;
	getCredentials: (projectId: ProjectId, origin: DomainUrl) => Promise<DecryptedCredential[]>;
	getAllCredentials: (projectId: ProjectId) => Promise<CredentialMetadata[]>;
	deleteCredential: (projectId: ProjectId, origin: DomainUrl, username: Username) => Promise<void>;
	load: () => Promise<void>;
	save: () => Promise<void>;
	_setStoragePath: (p: FilePath) => void;
};


