import type { THEME_MODES } from '../scripts/constants.js';

export type ThemeMode = typeof THEME_MODES[keyof typeof THEME_MODES];

export interface SettingsBase {
	env?: {
		alwaysChoose?: boolean;
	};
	theme?: ThemeMode;
	lastSeenVersion?: string;
	testServer?: {
		useHttps?: boolean;
		autoOpenBrowser?: boolean;
		useCustomDomain?: boolean;
	};
}

/** Settings stored at the application level */
export type AppSettings = SettingsBase;

/** Settings stored at the project level, keyed by projectId */
export type ProjectSettings = SettingsBase;

/** The full structure of the settings.json file */
export interface SettingsData {
	app: AppSettings;
	projects: Record<string, ProjectSettings>;
}
