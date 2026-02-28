<template>
	<ModalWrapper v-model="visible">
		<v-card class="pa-4" min-width="480">
			<v-card-text>
				<p class="font-weight-black text-h6 mb-4" data-qa="settings-modal-title">Settings</p>

				<v-tabs v-model="activeTab" color="primary">
					<v-tab value="project" data-qa="settings-tab-project">Project</v-tab>
					<v-tab value="app" data-qa="settings-tab-app">App</v-tab>
				</v-tabs>

				<v-tabs-window v-model="activeTab">
					<!-- Project-level settings -->
					<v-tabs-window-item value="project">
						<v-sheet class="pa-4">
							<p class="text-subtitle-2 mb-3">Settings for the current project</p>
							<v-checkbox
								v-model="projectAlwaysChoose"
								label="Always choose this environment for this project"
								density="compact"
								hide-details
								data-qa="settings-project-always-choose"
								@update:model-value="saveProjectSetting('env.alwaysChoose', $event)"
							/>
						</v-sheet>
					</v-tabs-window-item>

					<!-- App-level settings -->
					<v-tabs-window-item value="app">
						<v-sheet class="pa-4">
							<p class="text-subtitle-2 mb-3">App-wide defaults</p>
							<v-checkbox
								v-model="appAlwaysChoose"
								label="Default: always choose environment"
								density="compact"
								hide-details
								data-qa="settings-app-always-choose"
								@update:model-value="saveAppSetting('env.alwaysChoose', $event)"
							/>
						</v-sheet>
					</v-tabs-window-item>
				</v-tabs-window>
			</v-card-text>

			<v-card-actions class="justify-end px-4 pb-4">
				<v-btn
					variant="outlined"
					data-qa="settings-close"
					@click="visible = false"
				>
					Close
				</v-btn>
			</v-card-actions>
		</v-card>

		<!-- non-intrusive save confirmation toast -->
		<v-snackbar
			v-model="toastVisible"
			location="bottom right"
			:timeout="2000"
			color="success"
			data-qa="settings-saved-toast"
		>
			Setting saved
		</v-snackbar>
	</ModalWrapper>
</template>

<script>
import ModalWrapper from '@/components/ModalWrapper.vue';

export default {
	components: {
		ModalWrapper
	},

	data: () => ({
		visible: false,
		activeTab: `project`,
		projectId: null,
		projectAlwaysChoose: false,
		appAlwaysChoose: false,
		toastVisible: false
	}),

	mounted() {
		// Show this modal when requested by the main process
		window.eyas?.receive(`show-settings-modal`, ({ project = {}, app = {}, projectId = null } = {}) => {
			this.projectId = projectId;
			this.projectAlwaysChoose = !!(project?.env?.alwaysChoose);
			this.appAlwaysChoose = !!(app?.env?.alwaysChoose);
			this.activeTab = `project`;
			this.visible = true;
		});

		// Show toast when a setting is acknowledged by the main process
		window.eyas?.receive(`setting-saved`, () => {
			this.toastVisible = true;
		});
	},

	methods: {
		saveProjectSetting(key, value) {
			window.eyas?.send(`save-setting`, { key, value: !!value, projectId: this.projectId });
		},

		saveAppSetting(key, value) {
			window.eyas?.send(`save-setting`, { key, value: !!value, projectId: null });
		}
	}
};
</script>
