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

<script lang="ts">
import { THEME_MODES } from '@/../../../scripts/constants.js';
import useSettingsStore from '@/stores/settings.js';
import ModalWrapper from '@/components/ModalWrapper.vue';
import type { ChannelName, IsVisible, SettingKey, ProjectId, IsActive } from '@/../../../types/primitives.js';
import type { ThemeMode } from '@/../../../types/settings.js';

type TabName = `project` | `app`;

type SettingsModalState = {
	THEME_MODES: typeof THEME_MODES;
	visible: IsVisible;
	activeTab: TabName;
	projectId: ProjectId | null;
	toastVisible: IsVisible;
}

export default {
	components: {
		ModalWrapper
	},

	setup(): object {
		return {
			settingsStore: useSettingsStore()
		};
	},

	data: (): SettingsModalState => ({
		THEME_MODES,
		visible: false,
		activeTab: `project`,
		projectId: null,
		toastVisible: false
	}),

	computed: {
		appTheme: {
			get(): ThemeMode {
				return this.settingsStore.appSettings.theme || THEME_MODES.LIGHT;
			},
			set(val: ThemeMode): void {
				// Update local store instantly for immediate UI reaction
				this.settingsStore.setSetting(`theme` as SettingKey, val);
				// Synchronize with main process in the background
				this.saveAppSetting(`theme` as SettingKey, val);
			}
		},

		appAlwaysChoose: {
			get(): IsActive {
				return !!(this.settingsStore.appSettings.env?.alwaysChoose);
			},
			set(val: IsActive): void {
				this.settingsStore.setSetting(`env.alwaysChoose` as SettingKey, !!val);
				this.saveAppSetting(`env.alwaysChoose` as SettingKey, !!val);
			}
		},

		projectAlwaysChoose: {
			get(): IsActive {
				return !!(this.settingsStore.projectSettings.env?.alwaysChoose);
			},
			set(val: IsActive): void {
				this.settingsStore.setSetting(`env.alwaysChoose` as SettingKey, !!val, this.projectId);
				this.saveProjectSetting(`env.alwaysChoose` as SettingKey, !!val);
			}
		}
	},

	mounted(): void {
		// Show this modal when requested by the main process
		window.eyas?.receive(`show-settings-modal` as ChannelName, ({ project, app, projectId = null, systemTheme } = {}) => {
			this.projectId = projectId;
			this.settingsStore.loadFromPayload({ project, app, projectId, systemTheme });
			this.activeTab = `project`;
			this.toastVisible = false;
			this.visible = true;
		});

		// Show toast when a setting is acknowledged by the main process
		window.eyas?.receive(`setting-saved` as ChannelName, () => {
			if (this.visible) {
				this.toastVisible = true;
			}
		});
	},

	methods: {
		saveProjectSetting(key: SettingKey, value: unknown): void {
			window.eyas?.send(`save-setting` as ChannelName, { key, value, projectId: this.projectId });
		},

		saveAppSetting(key: SettingKey, value: unknown): void {
			window.eyas?.send(`save-setting` as ChannelName, { key, value, projectId: null });
		}
	}
};
</script>
