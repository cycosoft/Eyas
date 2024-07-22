<template>
	<ModalBackground :model-value="visible">
		<v-dialog
			v-model="visible"
			width="auto"
			persistent
			:scrim="false"
			@after-leave="hideUi"
			@keyup.esc="cancel"
			@keyup.enter="exit"
			@keyup.e="exit"
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
						:loading="exiting"
						@click="exit"
					>
						<u>E</u>xit
					</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</ModalBackground>
</template>

<script>
import ModalBackground from '@/components/ModalBackground.vue';
export default {
	data: () => ({
		visible: false,
		exiting: false
	}),

	components: {
		ModalBackground
	},

	mounted() {
		// Listen for messages from the main process
		window.eventBridge?.receive(`modal-exit-visible`, value => this.visible = value);
	},

	methods: {
		exit() {
			this.exiting = true;
			window.eventBridge?.send(`app-exit`);
		},

		cancel() {
			this.visible = false;
		},

		hideUi() {
			// hide the UI if there are no other dialogs open
			if(document.querySelectorAll(`.v-dialog`).length <= 1) {
				window.eventBridge?.send(`hide-ui`);
			}
		}
	}
};
</script>