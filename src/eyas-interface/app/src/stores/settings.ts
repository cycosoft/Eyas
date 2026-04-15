import { defineStore } from 'pinia';
import type { SettingsState, Payload } from '../types/settings.js';

export default defineStore(`settings`, {
	state: (): SettingsState => ({
		projectSettings: {},
		appSettings: {},
		projectId: null,
		systemTheme: `light`,
		version: `0.0.0`
	}),

	actions: {
		setProjectSettings(data: Record<string, unknown>) {
			this.projectSettings = { ...this.projectSettings, ...data };
		},

		setAppSettings(data: Record<string, unknown>) {
			this.appSettings = { ...this.appSettings, ...data };
		},

		setProjectId(id: string | null) {
			this.projectId = id;
		},

		setSetting(keyPath: string, value: unknown, projectId?: boolean) {
			this.$patch(state => {
				const target = projectId ? state.projectSettings : state.appSettings;
				const keys = keyPath.split(`.`);
				const last = keys.pop();
				if (!last) { return; }

				const obj = keys.reduce((acc: Record<string, unknown>, k: string) => {
					if (acc[k] === undefined || typeof acc[k] !== `object`) {
						acc[k] = {};
					}
					return acc[k] as Record<string, unknown>;
				}, target);

				// only update if the value has changed
				if (obj[last] !== value) {
					obj[last] = value;
				}
			});
		},

		setSystemTheme(theme: string) {
			this.systemTheme = theme;
		},

		loadFromPayload({ project, app, projectId, systemTheme, version }: Payload = {}) {
			if (project !== undefined) { this.projectSettings = project; }
			if (app !== undefined) { this.appSettings = app; }
			if (projectId !== undefined) { this.projectId = projectId; }
			if (systemTheme !== undefined) { this.systemTheme = systemTheme; }
			if (version !== undefined) { this.version = version; }
		}
	}
});
