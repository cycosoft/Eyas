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

		return {
			theme,
			settingsStore
		};
	},

	computed: {
		currentTheme() {
			return this.settingsStore.appSettings.theme || THEME_MODES.LIGHT;
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