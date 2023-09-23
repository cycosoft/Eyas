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
import { ipcRenderer } from 'electron';

export default {
	data: () => ({
		visible: true
	}),

	mounted() {
		// @ts-ignore
		ipcRenderer.on(`modal-exit-visible`, value => this.visible = value);
	},

	methods: {
		exit() {
			console.log(`exit()`);
		},

		cancel() {
			console.log(`cancel()`);
		}
	}
};
</script>