<template>
	<v-app>
		<!-- always display the blur so the user knows if the UI is active -->
		<v-overlay :model-value="true" persistent />

		<EnvironmentModal />
		<VariablesModal />
		<ExitModal />
		<VersionMismatchModal />
		<TestServerSetupModal />
		<TestServerActiveModal />
		<SettingsModal />
	</v-app>
</template>

<script>
import { onMounted } from 'vue';
import { useTheme } from 'vuetify';
import { THEME_MODES } from '@/../../../scripts/constants.js';
import useSettingsStore from '@/stores/settings';
import ExitModal from '@/components/ExitModal.vue';
import EnvironmentModal from '@/components/EnvironmentModal.vue';
import VariablesModal from '@/components/VariablesModal.vue';
import VersionMismatchModal from '@/components/VersionMismatchModal.vue';
import TestServerSetupModal from '@/components/TestServerSetupModal.vue';
import TestServerActiveModal from '@/components/TestServerActiveModal.vue';
import SettingsModal from '@/components/SettingsModal.vue';

export default {
	components: {
		EnvironmentModal,
		VariablesModal,
		ExitModal,
		VersionMismatchModal,
		TestServerSetupModal,
		TestServerActiveModal,
		SettingsModal
	},

	setup() {
		const theme = useTheme();
		const settingsStore = useSettingsStore();

		onMounted(() => {
			// listen for settings to be loaded from the main process
			window.eyas?.receive(`settings-loaded`, data => {
				settingsStore.loadFromPayload(data);
			});

			// listen for setting updates from the main process
			window.eyas?.receive(`settings-updated`, ({ key, value, projectId }) => {
				settingsStore.setSetting(key, value, projectId);
			});

			// listen for system theme updates
			window.eyas?.receive(`system-theme-updated`, theme => {
				settingsStore.setSystemTheme(theme);
			});

			// request initial settings
			window.eyas?.send(`get-settings`);
		});

		return {
			theme,
			settingsStore
		};
	},

	computed: {
		currentTheme() {
			const setting = this.settingsStore.appSettings.theme || THEME_MODES.LIGHT;
			return setting === THEME_MODES.SYSTEM ? this.settingsStore.systemTheme : setting;
		}
	},

	watch: {
		currentTheme: {
			immediate: true,
			handler(newVal) {
				this.theme.global.name.value = newVal;
			}
		}
	}
};

// detect when the network status changes
window.addEventListener(`online`, () => window.eyas?.send(`network-status`, true));
window.addEventListener(`offline`, () => window.eyas?.send(`network-status`, false));
</script>