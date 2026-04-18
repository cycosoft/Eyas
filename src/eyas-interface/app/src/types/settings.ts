export type SettingsState = {
	projectSettings: Record<string, unknown>;
	appSettings: Record<string, unknown>;
	projectId: string | null;
	systemTheme: string;
	version: string;
}

export type Payload = {
	project?: Record<string, unknown>;
	app?: Record<string, unknown>;
	projectId?: string | null;
	systemTheme?: string;
	version?: string;
}
