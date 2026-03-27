<template>
	<ModalWrapper v-model="visible">
		<v-card>
			<v-card-title class="text-title-large pt-3 px-3" data-qa="settings-title">Settings</v-card-title>
			<v-card-text class="px-0 pt-0">
				<v-tabs v-model="activeTab" color="primary">
					<v-tab value="project" data-qa="settings-tab-project">Project</v-tab>
					<v-tab value="app" data-qa="settings-tab-app">App</v-tab>
				</v-tabs>

				<v-window v-model="activeTab">
					<!-- Project-level settings -->
					<v-window-item value="project">
						<v-sheet class="pa-4">
							<v-checkbox
								v-model="projectAlwaysChoose"
								label="Remember Selected Environment"
								density="compact"
								hide-details
								data-qa="settings-project-always-choose"
								@update:model-value="saveProjectSetting('env.alwaysChoose', $event)"
							/>
						</v-sheet>
					</v-window-item>

					<!-- App-level settings -->
					<v-window-item value="app">
						<v-sheet class="pa-4">
							<v-checkbox
								v-model="appAlwaysChoose"
								label="Remember Selected Environment"
								density="compact"
								hide-details
								data-qa="settings-app-always-choose"
								@update:model-value="saveAppSetting('env.alwaysChoose', $event)"
							/>
						</v-sheet>
					</v-window-item>
				</v-window>
			</v-card-text>

			<v-card-actions>
				<v-spacer />
				<v-btn
					color="primary"
					variant="text"
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
			this.toastVisible = false;
			this.visible = true;
		});

		// Show toast when a setting is acknowledged by the main process
		window.eyas?.receive(`setting-saved`, () => {
			if (this.visible) {
				this.toastVisible = true;
			}
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
