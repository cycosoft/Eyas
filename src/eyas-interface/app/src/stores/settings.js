import { defineStore } from 'pinia';

export default defineStore(`settings`, {
	state: () => ({
		projectSettings: {},
		appSettings: {},
		projectId: null,
		systemTheme: 'light'
	}),

	actions: {
		setProjectSettings(data) {
			this.projectSettings = { ...this.projectSettings, ...data };
		},

		setAppSettings(data) {
			this.appSettings = { ...this.appSettings, ...data };
		},

		setProjectId(id) {
			this.projectId = id;
		},

		setSetting(keyPath, value, projectId) {
			const target = projectId ? this.projectSettings : this.appSettings;
			const keys = keyPath.split(`.`);
			const last = keys.pop();
			const obj = keys.reduce((acc, k) => {
				if (acc[k] === undefined || typeof acc[k] !== `object`) { acc[k] = {}; }
				return acc[k];
			}, target);
			obj[last] = value;
		},

		setSystemTheme(theme) {
			this.systemTheme = theme;
		},

		loadFromPayload({ project, app, projectId, systemTheme } = {}) {
			if (project !== undefined) { this.projectSettings = project; }
			if (app !== undefined) { this.appSettings = app; }
			if (projectId !== undefined) { this.projectId = projectId; }
			if (systemTheme !== undefined) { this.systemTheme = systemTheme; }
		}
	}
});
