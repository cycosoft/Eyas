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
			this.$patch(state => {
				const target = projectId ? state.projectSettings : state.appSettings;
				const keys = keyPath.split(`.`);
				const last = keys.pop();
				const obj = keys.reduce((acc, k) => {
					if (acc[k] === undefined || typeof acc[k] !== `object`) { acc[k] = {}; }
					return acc[k];
				}, target);

				// only update if the value has changed
				if (obj[last] !== value) {
					obj[last] = value;
				}
			});
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
