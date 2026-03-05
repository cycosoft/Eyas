import { defineStore } from 'pinia';

export default defineStore(`settings`, {
	state: () => ({
		projectSettings: {},
		appSettings: {},
		projectId: null
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

		loadFromPayload({ project, app, projectId } = {}) {
			if (project !== undefined) { this.projectSettings = project; }
			if (app !== undefined) { this.appSettings = app; }
			if (projectId !== undefined) { this.projectId = projectId; }
		}
	}
});
