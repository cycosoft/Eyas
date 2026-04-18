import { defineStore } from 'pinia';
import type { SettingsState, Payload } from '../types/settings.js';
import type { ProjectId, SystemTheme, SettingKey, SettingValue, SettingsMap, IsActive } from '../../../../types/primitives.js';

export default defineStore(`settings`, {
	state: (): SettingsState => ({
		projectSettings: {},
		appSettings: {},
		projectId: null,
		systemTheme: `light`,
		version: `0.0.0`
	}),

	actions: {
		setProjectSettings(data: SettingsMap) {
			this.projectSettings = { ...this.projectSettings, ...data };
		},

		setAppSettings(data: SettingsMap) {
			this.appSettings = { ...this.appSettings, ...data };
		},

		setProjectId(id: ProjectId | null) {
			this.projectId = id;
		},

		setSetting(keyPath: SettingKey, value: SettingValue, projectId?: IsActive) {
			this.$patch(state => {
				const target = projectId ? state.projectSettings : state.appSettings;
				const keys = keyPath.split(`.`);
				const last = keys.pop();
				if (!last) { return; }

				const obj = keys.reduce((acc: SettingsMap, k: SettingKey) => {
					if (acc[k] === undefined || typeof acc[k] !== `object`) {
						acc[k] = {};
					}
					return acc[k] as SettingsMap;
				}, target);

				// only update if the value has changed
				if (obj[last] !== value) {
					obj[last] = value;
				}
			});
		},

		setSystemTheme(theme: SystemTheme) {
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
