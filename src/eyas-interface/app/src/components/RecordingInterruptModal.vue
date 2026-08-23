<template>
	<EyasModal v-model="visible" size="compact">
		<template #title>
			<h2 class="font-headline text-h5 font-weight-bold text-on-surface tracking-tight" data-qa="recording-interrupt-modal-title">
				Interrupt this recording?
			</h2>
		</template>

		<p class="font-body text-body-2 text-grey-darken-1" data-qa="recording-interrupt-modal-text">
			A recording is still in progress. Starting this will stop it and keep what's been recorded so far.
		</p>

		<template #actions>
			<v-btn variant="text" data-qa="btn-cancel-interrupt-recording" @click="cancel">
				Cancel
			</v-btn>
			<div class="flex-grow-1" />
			<v-btn color="error" variant="elevated" data-qa="btn-confirm-interrupt-recording" @click="confirm">
				Interrupt
			</v-btn>
		</template>
	</EyasModal>
</template>

<script setup lang="ts">
import EyasModal from '@/components/EyasModal.vue';
import type { IsVisible } from '@registry/primitives.js';
import type { RecordingInterruptModalEmits } from '@registry/components.js';

const visible = defineModel<IsVisible>({ required: true });

const emit = defineEmits<RecordingInterruptModalEmits>();

function cancel(): void {
	visible.value = false;
}

function confirm(): void {
	visible.value = false;
	emit(`confirm`);
}
</script>
