<template>
	<v-app>
		<!-- <v-main>
			<v-container>
			</v-container>
		</v-main> -->

		<!-- always display the blur so the user knows if the UI is active -->
		<v-overlay class="ui-blur" :model-value="true">
			<div class="company-logo">
				<span class="cursor-pointer" @click="openInBrowser(`https://cycosoft.com`)">
					<img
						alt="Cycosoft, LLC logo"
						src="@/assets/cycosoft-logo.svg"
						width="175"
					>
				</span>
			</div>
		</v-overlay>

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
	},

	methods: {
		openInBrowser(url) {
			window.eventBridge?.send(`launch-link`, url, true);
		}
	}
};
</script>

<style scoped lang="scss">
.ui-blur:deep(.v-overlay__content){
	width: 100%;
	height: 100%;

	.company-logo {
		display: flex;
		height: 100%;
		align-items: flex-end;
		justify-content: flex-end;
	}
}
</style>