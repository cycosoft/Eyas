<template>
	<EyasModal v-model="visible">
		<template #title>
			<h2 class="font-headline text-h5 font-weight-bold text-on-surface tracking-tight" data-qa="recording-delete-modal-title">
				Delete this recording?
			</h2>
		</template>

		<p class="font-body text-body-2 text-grey-darken-1" data-qa="recording-delete-modal-text">
			This will remove the recording and its run history. This can't be undone.
		</p>

		<template #actions>
			<v-btn variant="text" data-qa="btn-cancel-delete-recording" @click="cancel">
				Cancel
			</v-btn>
			<div class="flex-grow-1" />
			<v-btn color="error" variant="elevated" data-qa="btn-confirm-delete-recording" @click="confirm">
				Delete
			</v-btn>
		</template>
	</EyasModal>
</template>

<script setup lang="ts">
import EyasModal from '@/components/EyasModal.vue';
import type { IsVisible } from '@registry/primitives.js';
import type { RecordingDeleteModalEmits } from '@registry/components.js';

const visible = defineModel<IsVisible>({ required: true });

const emit = defineEmits<RecordingDeleteModalEmits>();

function cancel(): void {
	visible.value = false;
}

function confirm(): void {
	visible.value = false;
	emit(`confirm`);
}
</script>
