<template>
	<v-overlay v-model="visible" class="exit-modal text-white">
		<div class="ad-space">
			<a
				href="https://cycosoft.com"
				target="_blank"
				rel="noopener noreferrer"
			>
				<img
					alt="Cycosoft, LLC logo"
					src="@/assets/cycosoft-logo.svg"
					width="175"
				>
			</a>
		</div>

		<v-dialog
			v-model="visible"
			persistent
			width="auto"
			:scrim="false"
		>
			<v-card>
				<v-card-text>
					Would you like to exit the test?
				</v-card-text>

				<v-card-actions class="mt-5">
					<v-btn @click="cancel">
						Cancel
					</v-btn>

					<div class="flex-grow-1" />

					<v-btn
						color="error"
						variant="elevated"
						@click="exit"
					>
						Exit
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</v-overlay>
</template>

<script>
export default {
	data: () => ({
		visible: false
	}),

	mounted() {
		// Listen for messages from the main process
		window.eventBridge?.receive(`modal-exit-visible`, value => {
			this.visible = value;
		});
	},

	methods: {
		exit() {
			window.eventBridge?.send(`app-exit`);
		},

		cancel() {
			this.visible = false;
		}
	}
};
</script>

<style scoped lang="scss">
.exit-modal:deep(.v-overlay__content){
	width: 100%;
	height: 100%;

	.ad-space {
		display: flex;
		height: 100%;
		align-items: flex-end;
		justify-content: flex-end;
	}
}
</style>