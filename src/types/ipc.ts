import type { ProjectId, DomainUrl, IsActive, SettingKey } from './primitives.js';
import type { EnvironmentChoice, Viewport, ViewportSize } from './core.js';

/** Payload for selecting a test environment */
export type EnvironmentSelectedPayload = DomainUrl | EnvironmentChoice;

/** The current state of the application update process */
export type UpdateStatus = `idle` | `checking` | `downloading` | `downloaded` | `error`;

export const VALID_SEND_CHANNELS = [
	`app-exit`,
	`hide-ui`,
	`show-ui`,
	`environment-selected`,
	`launch-link`,
	`network-status`,
	`test-server-setup-continue`,
	`test-server-setup-step`,
	`test-server-resume-confirm`,
	`test-server-stop`,
	`test-server-open-browser`,
	`test-server-extend`,
	`save-setting`,
	`get-settings`,
	`renderer-ready-for-modals`,
	`whats-new-closed`,
	`show-about`,
	`show-settings`,
	`show-whats-new`,
	`show-test-server-setup`,
	`request-exit`,
	`browser-back`,
	`browser-forward`,
	`browser-reload`,
	`browser-home`,
	`open-external`,
	`set-viewport`,
	`clear-cache`,
	`open-cache-folder`,
	`open-devtools-ui`,
	`open-devtools-test`,
	`check-for-updates`,
	`install-update`
] as const;

export const VALID_RECEIVE_CHANNELS = [
	`modal-exit-visible`,
	`show-environment-modal`,
	`show-variables-modal`,
	`show-version-mismatch-modal`,
	`show-test-server-setup-modal`,
	`show-test-server-resume-modal`,
	`show-test-server-active-modal`,
	`test-server-timeout`,
	`close-modals`,
	`show-settings-modal`,
	`setting-saved`,
	`settings-loaded`,
	`show-whats-new`,
	`ui-shown`,
	`navigation-state-updated`,
	`update-status-updated`
] as const;

/** Payload for the 'navigation-state-updated' IPC event */
export type NavigationStatePayload = {
	canGoBack: IsActive;
	canGoForward: IsActive;
	viewports?: Viewport[];
	currentViewport?: ViewportSize;
	cacheSize?: number;
	sessionAge?: string;
	isDev?: boolean;
};

type SendChannel = typeof VALID_SEND_CHANNELS[number];
type ReceiveChannel = typeof VALID_RECEIVE_CHANNELS[number];
export type ChannelName = SendChannel | ReceiveChannel;

/**
 * Interface for the 'eyas' object injected into the browser window.
 */
type EyasInterface = {
	send: (channel: SendChannel, ...args: unknown[]) => void;
	receive: (channel: ReceiveChannel, callback: (...args: unknown[]) => void) => void;
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
