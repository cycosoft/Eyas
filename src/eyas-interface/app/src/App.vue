<template>
	<v-app>
		<v-main>
			<v-container>
			</v-container>
		</v-main>

		<ExitModal />
	</v-app>
</template>

<script>
import ExitModal from '@/components/ExitModal.vue';

export default {
	components: {
		ExitModal
	}
};
</script>

<style lang="scss">
.v-application {
	// allow seeing the eyas content
	background-color: transparent !important;
}
</style>