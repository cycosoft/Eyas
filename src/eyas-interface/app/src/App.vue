<template>
	<v-app data-qa="app-container">
		<!-- always display the blur so the user knows if the UI is active -->
		<v-overlay :model-value="true" persistent />

		<EnvironmentModal />
		<VariablesModal />
		<ExitModal />
		<VersionMismatchModal />
		<TestServerSetupModal />
		<TestServerActiveModal />
		<SettingsModal />
		<WhatsNewModal />
	</v-app>
</template>

<script>
import { onMounted, watch, computed } from 'vue';
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
import WhatsNewModal from '@/components/WhatsNewModal.vue';
import changelogData from '@/CHANGELOG.json';

export default {
	components: {
		EnvironmentModal,
		VariablesModal,
		ExitModal,
		VersionMismatchModal,
		TestServerSetupModal,
		TestServerActiveModal,
		SettingsModal,
		WhatsNewModal
	},

	setup() {
		const theme = useTheme();
		const settingsStore = useSettingsStore();

		const currentTheme = computed(() => {
			const setting = settingsStore.appSettings.theme || THEME_MODES.LIGHT;
			return setting === THEME_MODES.SYSTEM ? settingsStore.systemTheme : setting;
		});

		watch(currentTheme, newVal => {
			theme.global.name.value = newVal;
		}, { immediate: true });

		onMounted(() => {
			// listen for settings to be loaded from the main process
			window.eyas?.receive(`settings-loaded`, data => {
				settingsStore.loadFromPayload(data);
				// once settings are loaded, signal that we are ready for startup modals
				window.eyas?.send(`renderer-ready-for-modals`, changelogData[0]?.version);
			});

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
			settingsStore,
			currentTheme
		};
	}
};

// detect when the network status changes
window.addEventListener(`online`, () => window.eyas?.send(`network-status`, true));
window.addEventListener(`offline`, () => window.eyas?.send(`network-status`, false));
</script>