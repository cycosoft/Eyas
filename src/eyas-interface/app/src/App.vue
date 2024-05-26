<template>
	<v-app>
		<!-- <v-main>
			<v-container>
			</v-container>
		</v-main> -->

		<EnvironmentModal />
		<VariablesModal :key="resetTracker.variableModal" @reset="resetTracker.variableModal++" />
		<ExitModal />
	</v-app>
</template>

<script>
import ExitModal from '@/components/ExitModal.vue';
import EnvironmentModal from '@/components/EnvironmentModal.vue';
import VariablesModal from '@/components/VariablesModal.vue';

export default {
	components: {
		EnvironmentModal,
		VariablesModal,
		ExitModal
	},

	data: () => ({
		resetTracker: {
			variableModal: 0
		}
	})
};
</script>

<style lang="scss">
.v-application {
	// allow seeing the eyas content
	background-color: transparent !important;
}
</style>