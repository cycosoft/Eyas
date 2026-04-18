import type { ProjectId, SystemTheme, AppVersion, SettingsMap } from '../../../../types/primitives.js';

export type SettingsState = {
	projectSettings: SettingsMap;
	appSettings: SettingsMap;
	projectId: ProjectId | null;
	systemTheme: SystemTheme;
	version: AppVersion;
}

export type Payload = {
	project?: SettingsMap;
	app?: SettingsMap;
	projectId?: ProjectId | null;
	systemTheme?: SystemTheme;
	version?: AppVersion;
}
