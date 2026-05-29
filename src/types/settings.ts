import type { THEME_MODES } from '@scripts/constants.js';
import type { EnvironmentSettings, TestServerSettings } from './core.js';
export type { EnvironmentSettings };
import type { AppVersion, ProjectId, LabelString } from './primitives.js';

export type ThemeMode = typeof THEME_MODES[keyof typeof THEME_MODES];

export type AutofillTheme = {
	bg: LabelString;
	border: LabelString;
	color: LabelString;
	shadow: LabelString;
	itemBorder: LabelString;
	itemHoverBg: LabelString;
	maskColor: LabelString;
};

type SettingsBase = {
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
};
