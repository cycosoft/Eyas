<template>
	<v-app>
		<v-main>
			<v-container>
				<ExitModal />
			</v-container>
		</v-main>
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