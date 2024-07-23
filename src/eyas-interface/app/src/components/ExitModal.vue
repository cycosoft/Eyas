<template>
	<ModalWrapper
		v-model="visible"
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
	</ModalWrapper>
</template>

<script>
import ModalWrapper from '@/components/ModalWrapper.vue';

export default {
	components: {
		ModalWrapper
	},

	data: () => ({
		visible: false,
		exiting: false
	}),

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
		}
	}
};
</script>