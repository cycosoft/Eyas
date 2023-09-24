<template>
	<v-dialog
		v-model="visible"
		width="auto"
	>
		<v-card>
			<v-card-text>
				Would you like to exit the test?
			</v-card-text>

			<v-card-actions class="mt-5">
				<v-btn @click="cancel">
					Cancel
				</v-btn>
				<v-spacer />
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
</template>

<script>
export default {
	data: () => ({
		visible: false
	}),

	mounted() {
		// Listen for messages from the main process
		window.api?.receive(`modal-exit-visible`, value => {
			this.visible = value;
		});
	},

	methods: {
		exit() {
			console.log(`exit()`);
			window.api?.send(`app-exit`);
		},

		cancel() {
			console.log(`cancel()`);
			this.visible = false;
		}
	}
};
</script>