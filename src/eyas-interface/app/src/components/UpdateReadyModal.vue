<template>
	<ModalWrapper
		v-model="visible"
		type="dialog"
		@keyup.esc="cancel"
		@keyup.enter="update"
		@keyup.u="update"
	>
		<v-card>
			<v-card-title class="text-h5">
				Update Ready to Install
			</v-card-title>

			<v-card-text data-qa="update-ready-modal-text">
				A new version of Eyas has been downloaded and is ready to install. The application will restart to complete the update.
			</v-card-text>

			<v-card-actions class="mt-5">
				<v-btn data-qa="btn-update-later" @click="cancel">
					Later
				</v-btn>

				<div class="flex-grow-1" />

				<v-btn
					color="primary"
					variant="elevated"
					:loading="updating"
					data-qa="btn-update-now"
					@click="update"
				>
					<u>U</u>pdate Eyas Now
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
const updating = ref<IsPending>(false);

const update = (): void => {
	updating.value = true;
	window.eyas?.send(`install-update` as ChannelName);
};

const cancel = (): void => {
	visible.value = false;
};

onMounted(() => {
	// Listen for messages from the main process
	window.eyas?.receive(`show-update-ready-modal` as ChannelName, (value: IsVisible) => {
		visible.value = value;
	});
});
</script>
