<template>
	<EyasModal v-model="isOpen" mode="panel">
		<template #title>
			<div class="d-flex align-center justify-space-between">
				<h2 class="font-headline text-h6 font-weight-bold text-on-surface" data-qa="recording-panel-title">
					Manage Recordings
				</h2>
				<v-btn icon variant="plain" :ripple="false" density="compact" class="mx-0" rounded="lg" data-qa="btn-recording-panel-close" @click="close">
					<v-icon icon="mdi-close" size="small" />
				</v-btn>
			</div>
		</template>

		<p class="font-body text-body-2 text-grey-darken-1" data-qa="recording-panel-placeholder">
			Saved recording sessions will show up here.
		</p>
	</EyasModal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import EyasModal from '@/components/EyasModal.vue';
import useRecordingStore from '@/stores/recording.js';
import type { IsVisible } from '@registry/primitives.js';

const recordingStore = useRecordingStore();

const isOpen = computed<IsVisible>({
	get: () => recordingStore.isPanelOpen,
	set: (value: IsVisible) => {
		recordingStore.isPanelOpen = value;
	}
});

const close = (): void => {
	recordingStore.isPanelOpen = false;
};
</script>
