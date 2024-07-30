<template>
	<v-app>
		<!-- always display the blur so the user knows if the UI is active -->
		<v-overlay :model-value="true" persistent />

		<EnvironmentModal />
		<VariablesModal />
		<ExitModal />
		<VersionMismatchModal />
	</v-app>
</template>

<script>
import ExitModal from '@/components/ExitModal.vue';
import EnvironmentModal from '@/components/EnvironmentModal.vue';
import VariablesModal from '@/components/VariablesModal.vue';
import VersionMismatchModal from '@/components/VersionMismatchModal.vue';

export default {
	components: {
		EnvironmentModal,
		VariablesModal,
		ExitModal,
		VersionMismatchModal
	}
};

// detect when the network status changes
window.addEventListener(`online`, () => updateNetworkStatus(true));
window.addEventListener(`offline`, () => updateNetworkStatus(false));
function updateNetworkStatus(status) {
	window.eventBridge?.send(`network-status`, status);
}
</script>