import type { THEME_MODES } from '@scripts/constants.js';
import type { EnvironmentSettings, TestServerSettings } from './core.js';
import type { AppVersion, ProjectId } from './primitives.js';

export type ThemeMode = typeof THEME_MODES[keyof typeof THEME_MODES];

export type SettingsBase = {
	env?: EnvironmentSettings;
	theme?: ThemeMode;
	lastSeenVersion?: AppVersion;
	testServer?: TestServerSettings;
}

/** Settings stored at the application level */
export type AppSettings = SettingsBase;

/** Settings stored at the project level, keyed by projectId */
export type ProjectSettings = SettingsBase;

/** The full structure of the settings.json file */
export type SettingsData = {
	app: AppSettings;
	projects: Record<ProjectId, ProjectSettings>;
}
