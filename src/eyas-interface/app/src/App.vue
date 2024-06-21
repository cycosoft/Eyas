<template>
	<v-app>
		<!-- <v-main>
			<v-container>
			</v-container>
		</v-main> -->

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
</script>

<style lang="scss">
.v-application {
	// allow seeing the eyas content
	background-color: transparent !important;
}
</style>