import type { ProjectId, DomainUrl, IsActive, SettingKey, HashString, Username, PasswordPlain, ZoomFactor, StepCount, DetailText } from './primitives.js';
import type { EnvironmentChoice, Viewport, ViewportSize, EnvironmentChoiceWithTitle } from './core.js';
import type { NavItem } from './components.js';
import type { RecordingStep, ReplayMismatch, EyasRecordingEnvelope } from './recording.js';

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
	`launch-link-variable`,
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
	`browser-copy-url`,
	`open-external`,
	`set-viewport`,
	`clear-cache`,
	`open-cache-folder`,
	`open-devtools-ui`,
	`open-devtools-test`,
	`open-devtools-console`,
	`check-for-updates`,
	`install-update`,
	`request-update-ready-modal`,
	`update-titlebar-overlay`,
	`save-login-attempt`,
	`save-credential-confirm`,
	`get-credentials`,
	`delete-credential`,
	`is-dark-theme`,
	`adjust-zoom`,
	`recorder-flush-steps`,
	`recorder-stop`,
	`recorder-record-start`,
	`recorder-replay-request`,
	`recorder-replay-stop`,
	`recorder-list-sessions`,
	`recorder-get-session`
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
	`update-status-updated`,
	`show-update-ready-modal`,
	`show-no-update-modal`,
	`show-save-credential-modal`,
	`recorder-status-updated`,
	`recorder-playback-status`,
	`recorder-sessions-listed`,
	`recorder-session-loaded`
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
	links?: NavItem[];
	currentUrl?: string;
	environments?: EnvironmentChoiceWithTitle[];
	currentEnvironment?: DomainUrl | null;
	projectId?: ProjectId;
	domainsHash?: HashString | null;
	testNetworkEnabled?: IsActive;
	appTitle?: string;
	configTitle?: string;
	appVersion?: string;
	pageTitle?: string;
	platform?: string;
	jsErrorsCount?: number;
	jsWarningsCount?: number;
	zoomFactor?: ZoomFactor;
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

type ColorHex = string;

/** Payload for the 'update-titlebar-overlay' IPC event */
export type TitleBarOverlayPayload = {
	color: ColorHex;
	symbolColor: ColorHex;
};

/** Payload containing credential details to be saved */
export type CredentialPayload = {
	origin: DomainUrl;
	username: Username;
	passwordPlain: PasswordPlain;
};

/** Payload for fetching credentials of a specific origin */
export type GetCredentialsPayload = {
	origin: DomainUrl;
};

/** Payload for the 'recorder-replay-request' IPC event */
export type RecorderReplayRequestPayload = {
	sessionId: string;
};

/** Payload for the 'recorder-flush-steps' IPC event */
export type RecorderFlushStepsPayload = RecordingStep[];

/** Payload for the 'recorder-playback-status' IPC event */
export type RecorderPlaybackStatusPayload = {
	completedSteps?: StepCount;
	error?: string;
	/**
	 * Recorded expectations that didn't hold. Distinct from `error`: a replay can finish cleanly and
	 * still have findings, and a failed one can have gathered some before it threw.
	 */
	mismatches?: ReplayMismatch[];
	/**
	 * Set on `playing` when the session was written by a build newer than this one, so the tester is
	 * told *before* watching a replay that may be structurally incomplete rather than after. Sent
	 * only when there's something to say — a normal run's `playing` payload is unchanged.
	 */
	schemaWarning?: DetailText;
	status: `playing` | `stopped` | `failed`;
	totalSteps?: StepCount;
};

/**
 * Lightweight listing entry for a saved/active recording, sent over `recorder-sessions-listed`
 * instead of the full envelope — the browser view only needs enough to render a row, not every
 * step, so a session with thousands of steps doesn't get serialized just to list it.
 */
export type RecordingSessionSummary = {
	sessionId: string;
	title: string;
	status: `recording` | `stopped`;
	startedAt: number;
	stoppedAt: number | null;
	stepCount: StepCount;
};

/** Payload for the 'recorder-sessions-listed' IPC event */
export type RecorderSessionsListedPayload = RecordingSessionSummary[];

/** Payload for the 'recorder-get-session' IPC event */
export type RecorderGetSessionPayload = {
	sessionId: string;
};

/** Payload for the 'recorder-session-loaded' IPC event; null when the requested session no longer exists on disk. */
export type RecorderSessionLoadedPayload = EyasRecordingEnvelope | null;

