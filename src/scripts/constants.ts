import type { TestId, SessionPartition } from '@registry/primitives.js';

// different methods for loading a test
export const LOAD_TYPES = {
	AUTO: `auto`, // directs config to make best guess
	WEB: `web`, // fetched via the web
	ASSOCIATION: `association`, // e.g. double-clicking a file on the desktop
	ROOT: `root`, // an *.eyas located at the runner root
	CLI: `cli` // raw config loaded during build step
} as const;

// the file extension for an eyas test
export const EXTENSION = `.eyas` as const;

// The duration in milliseconds before the test server automatically shuts down
export const TEST_SERVER_SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Theme modes for the UI
export const THEME_MODES = {
	LIGHT: `light`,
	DARK: `dark`,
	SYSTEM: `system`
} as const;

// Default values for user settings (used as the final fallback in the cascade)
export const SETTINGS_DEFAULTS = {
	env: {
		alwaysChoose: false
	},
	theme: THEME_MODES.LIGHT,
	lastSeenVersion: `0.0.0`,
	testServer: {
		useHttps: false,
		autoOpenBrowser: true,
		useCustomDomain: false
	},
	allowBypassUpdates: false,
	// this default is currently moot: session-playback.service.ts hardcodes "natural" regardless of
	// what's stored, and the settings-modal control that would let a user change it is hidden (see
	// SettingsModal.vue). Set to `natural` so it reflects actual runtime behavior if ever read directly.
	recording: {
		replaySpeed: `natural`
	}
} as const;

// Matches the height of a Vuetify v-app-bar with density="compact" (48) + v-system-bar (30) + 1px border.
// Using 79 prevents the bottom border from being cut off in the UI layer.
// NOTE: Odd heights can cause 1px rounding discrepancies on high-DPI (Retina) displays.
export const EYAS_HEADER_HEIGHT = 79;

// Duration of the test-running ring's fade in/out CSS transition (TestRunningRing.vue). The main
// process holds off collapsing the UI layer for playback teardown by this same duration, so the
// ring's fade-out isn't clipped by the layer shrinking out from under it mid-transition.
export const TEST_RUNNING_RING_FADE_MS = 250;

// How long the playback-progress ring (AppHeaderRecordingControls.vue) holds at 100% completion
// before the "stopped" status resets/hides it. Without this hold, the 100%-complete status and
// the immediately-following "stopped" status (which resets progress to 0) land in the same tick,
// so the browser never paints the 100% frame — the last visible frame is one step short of full.
// Matches the ring's own `stroke-dashoffset` transition duration so the fill visibly completes.
export const PLAYBACK_COMPLETE_HOLD_MS = 200;

// Session partition for all Eyas-owned windows/views (app window, splash, UI layer).
// App-wide by design: the UI is identical for every test and stores no test-scoped data.
// The test layer gets its own per-test-id partition (`persist:<testId>-test`) instead.
export const EYAS_UI_PARTITION = `persist:eyas-ui`;

/**
 * Builds the session partition string for the test layer.
 * Per-test-id so each test's cookies/storage/cache stay isolated from other tests.
 * Must be used everywhere the test session is referenced (view creation, protocol
 * handlers, webRequest interception) so they all resolve to the same session.
 */
export function getTestPartition(testId?: TestId): SessionPartition {
	return `persist:${testId || `default`}-test`;
}
