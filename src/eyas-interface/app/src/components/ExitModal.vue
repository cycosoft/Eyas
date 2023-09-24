<template>
	<v-overlay v-model="visible" class="text-white">
		Cycosoft, LLC says thank you

		<v-dialog
			v-model="visible"
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
		visible: true
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