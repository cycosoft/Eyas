<template>
	<v-overlay class="custom-background" :model-value="modelValue">
		<template v-if="contentVisible">
			<div class="bottom-right">
				<span class="cursor-pointer" @click="openInBrowser(`https://cycosoft.com`)">
					<img
						alt="Cycosoft, LLC logo"
						src="@/assets/cycosoft-logo.svg"
						width="175"
					>
				</span>
			</div>
		</template>
	</v-overlay>

	<slot />
</template>

<script>
export default {
	props: {
		modelValue: Boolean,
		contentVisible: Boolean
	},

	methods: {
		openInBrowser(url) {
			window.eventBridge?.send(`launch-link`, { url, openInBrowser: true });
		}
	}
};
</script>

<style scoped lang="scss">
.custom-background:deep(.v-overlay__content){
	width: 100%;
	height: 100%;

	// disable highlighting of background content
	user-select: none;

	.bottom-right {
		display: flex;
		height: 100%;
		align-items: flex-end;
		justify-content: flex-end;
	}
}
</style>