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
				<v-btn @click="visible = false">
					Cancel
				</v-btn>
				<v-spacer />
				<v-btn
					color="error"
					variant="elevated"
					@click="visible = false"
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
		visible: true
	}),

	mounted() {
		// Listen for messages from the main process
		window.api.receive(`fromMain`, (event, value) => {
			if(event === `modal-exit-visible`){
				this.visible = value;
			}
		});
	},

	methods: {
		exit() {
			console.log(`exit()`);
			window.api.send(`toMain`, `app-exit`);
		},

		cancel() {
			console.log(`cancel()`);
		}
	}
};
</script>