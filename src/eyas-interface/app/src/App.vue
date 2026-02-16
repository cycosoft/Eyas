<template>
	<v-app>
		<!-- always display the blur so the user knows if the UI is active -->
		<v-overlay :model-value="true" persistent />

		<EnvironmentModal />
		<VariablesModal />
		<ExitModal />
		<VersionMismatchModal />
		<ExposeSetupModal />
		<ExposeResumeModal />
	</v-app>
</template>

<script>
import ExitModal from '@/components/ExitModal.vue';
import EnvironmentModal from '@/components/EnvironmentModal.vue';
import VariablesModal from '@/components/VariablesModal.vue';
import VersionMismatchModal from '@/components/VersionMismatchModal.vue';
import ExposeSetupModal from '@/components/ExposeSetupModal.vue';
import ExposeResumeModal from '@/components/ExposeResumeModal.vue';

export default {
	components: {
		EnvironmentModal,
		VariablesModal,
		ExitModal,
		VersionMismatchModal,
		ExposeSetupModal,
		ExposeResumeModal
	}
};

// detect when the network status changes
window.addEventListener(`online`, () => window.eyas?.send(`network-status`, true));
window.addEventListener(`offline`, () => window.eyas?.send(`network-status`, false));
</script>