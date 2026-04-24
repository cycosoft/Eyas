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
	}
} as const;
// The pixel height of the persistent Eyas header/navigation bar.
// Set to 0 until the header is built. When the header is implemented,
// update this value and the content view layout will adjust automatically.
export const EYAS_HEADER_HEIGHT = 0;
