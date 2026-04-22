<template>
	<ModalWrapper
		v-model="visible"
		type="dialog"
		@keyup.esc="cancel"
		@keyup.enter="exit"
		@keyup.e="exit"
	>
		<v-card>
			<v-card-text data-qa="exit-modal-text">
				Would you like to exit the test?
			</v-card-text>

			<v-card-actions class="mt-5">
				<v-btn data-qa="btn-cancel-exit" @click="cancel">
					Cancel
				</v-btn>

				<div class="flex-grow-1" />

				<v-btn
					color="error"
					variant="elevated"
					:loading="exiting"
					data-qa="btn-exit"
					@click="exit"
				>
					<u>E</u>xit
				</v-btn>
			</v-card-actions>
		</v-card>
	</ModalWrapper>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import ModalWrapper from '@/components/ModalWrapper.vue';
import type { ChannelName, IsVisible, IsPending } from '@/../../../types/primitives.js';

const visible = ref<IsVisible>(false);
const exiting = ref<IsPending>(false);

const exit = (): void => {
	exiting.value = true;
	window.eyas?.send(`app-exit` as ChannelName);
};

const cancel = (): void => {
	visible.value = false;
};

onMounted(() => {
	// Listen for messages from the main process
	window.eyas?.receive(`modal-exit-visible` as ChannelName, (value: IsVisible) => visible.value = value);
});
</script>