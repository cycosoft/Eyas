import type { ChannelName, ProjectId, DomainUrl, IsActive, SettingKey } from './primitives.js';

/** Payload for selecting a test environment */
export type EnvironmentSelectedPayload = DomainUrl | {
	url: DomainUrl;
	key?: SettingKey;
};

/**
 * Interface for the 'eyas' object injected into the browser window.
 */
export type EyasInterface = {
	send: (channel: ChannelName, ...args: unknown[]) => void;
	receive: (channel: ChannelName, callback: (...args: unknown[]) => void) => void;
};

/**
 * Type helper for casting window with 'eyas' interface.
 */
export type WindowWithEyas = {
	eyas: EyasInterface;
};

/** Payload for launching a link */
export type LaunchLinkPayload = {
	url: DomainUrl;
	openInBrowser: IsActive;
};

/** Payload for the 'save-setting' IPC event */
export type SaveSettingPayload = {
	key: SettingKey;
	value: unknown;
	projectId?: ProjectId;
};

/** Payload for the 'test-server-setup-continue' IPC event */
export type TestServerSetupPayload = {
	useHttps: IsActive;
	autoOpenBrowser: IsActive;
	useCustomDomain: IsActive;
};
