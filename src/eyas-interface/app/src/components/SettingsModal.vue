<template>
	<ModalWrapper v-model="visible">
		<v-card>
			<v-card-title class="text-title-large pt-3 px-3" data-qa="settings-title">
				Settings
			</v-card-title>
			<v-card-text class="px-0 pt-0">
				<v-tabs v-model="activeTab" color="primary">
					<v-tab value="project" data-qa="settings-tab-project">
						Project
					</v-tab>
					<v-tab value="app" data-qa="settings-tab-app">
						App
					</v-tab>
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
							/>
						</v-sheet>
					</v-window-item>

					<!-- App-level settings -->
					<v-window-item value="app">
						<v-sheet class="pa-4 pt-0">
							<v-label class="text-caption mb-1">
								Theme Mode
							</v-label>
							<v-radio-group
								v-model="appTheme"
								inline
								density="compact"
								hide-details
								data-qa="settings-app-theme"
							>
								<v-radio label="Light" :value="THEME_MODES.LIGHT" data-qa="settings-app-theme-light" />
								<v-radio label="Dark" :value="THEME_MODES.DARK" data-qa="settings-app-theme-dark" />
								<v-radio label="System" :value="THEME_MODES.SYSTEM" data-qa="settings-app-theme-system" />
							</v-radio-group>

							<v-divider class="my-4" />

							<v-checkbox
								v-model="appAlwaysChoose"
								label="Remember Selected Environment"
								density="compact"
								hide-details
								data-qa="settings-app-always-choose"
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

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { THEME_MODES } from '@/../../../scripts/constants.js';
import useSettingsStore from '@/stores/settings.js';
import ModalWrapper from '@/components/ModalWrapper.vue';
import type { ChannelName, IsVisible, SettingKey, ProjectId, IsActive } from '@/../../../types/primitives.js';
import type { ThemeMode } from '@/../../../types/settings.js';

type TabName = `project` | `app`;

const settingsStore = useSettingsStore();

const visible = ref<IsVisible>(false);
const activeTab = ref<TabName>(`project`);
const projectId = ref<ProjectId | null>(null);
const toastVisible = ref<IsVisible>(false);

const saveProjectSetting = (key: SettingKey, value: unknown): void => {
	window.eyas?.send(`save-setting` as ChannelName, { key, value, projectId: projectId.value });
};

const saveAppSetting = (key: SettingKey, value: unknown): void => {
	window.eyas?.send(`save-setting` as ChannelName, { key, value, projectId: null });
};

const appTheme = computed({
	get(): ThemeMode {
		return settingsStore.appSettings.theme || THEME_MODES.LIGHT;
	},
	set(val: ThemeMode): void {
		// Update local store instantly for immediate UI reaction
		settingsStore.setSetting(`theme` as SettingKey, val);
		// Synchronize with main process in the background
		saveAppSetting(`theme` as SettingKey, val);
	}
});

const appAlwaysChoose = computed({
	get(): IsActive {
		return !!(settingsStore.appSettings.env?.alwaysChoose);
	},
	set(val: IsActive): void {
		settingsStore.setSetting(`env.alwaysChoose` as SettingKey, !!val);
		saveAppSetting(`env.alwaysChoose` as SettingKey, !!val);
	}
});

const projectAlwaysChoose = computed({
	get(): IsActive {
		return !!(settingsStore.projectSettings.env?.alwaysChoose);
	},
	set(val: IsActive): void {
		settingsStore.setSetting(`env.alwaysChoose` as SettingKey, !!val, projectId.value);
		saveProjectSetting(`env.alwaysChoose` as SettingKey, !!val);
	}
});

onMounted(() => {
	// Show this modal when requested by the main process
	window.eyas?.receive(`show-settings-modal` as ChannelName, ({ project, app, projectId: newProjectId = null, systemTheme } = {}) => {
		projectId.value = newProjectId;
		settingsStore.loadFromPayload({ project, app, projectId: newProjectId, systemTheme });
		activeTab.value = `project`;
		toastVisible.value = false;
		visible.value = true;
	});

	// Show toast when a setting is acknowledged by the main process
	window.eyas?.receive(`setting-saved` as ChannelName, () => {
		if (visible.value) {
			toastVisible.value = true;
		}
	});
});

defineExpose({
	visible,
	toastVisible,
	projectId,
	activeTab,
	projectAlwaysChoose,
	appAlwaysChoose,
	saveProjectSetting,
	saveAppSetting
});
</script>
