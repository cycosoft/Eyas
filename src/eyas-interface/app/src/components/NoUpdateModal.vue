<template>
	<ModalWrapper
		v-model="visible"
		type="dialog"
		@keyup.esc="close"
		@keyup.enter="close"
		@click:outside="close"
	>
		<v-card max-width="400">
			<v-card-title class="text-h6">
				Eyas is Up to Date
			</v-card-title>
			<v-card-text data-qa="no-update-modal-text">
				You are running the latest version of Eyas.
			</v-card-text>

			<v-card-actions class="mt-5">
				<div class="flex-grow-1" />

				<v-btn
					color="primary"
					variant="elevated"
					class="position-relative overflow-hidden pr-6 pl-6"
					data-qa="btn-no-update-ok"
					@click="close"
				>
					OK
					<v-progress-linear
						:model-value="progress"
						absolute
						bottom
						color="rgba(255, 255, 255, 0.4)"
						height="4"
					/>
				</v-btn>
			</v-card-actions>
		</v-card>
	</ModalWrapper>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import ModalWrapper from '@/components/ModalWrapper.vue';
import type { ChannelName, IsVisible } from '@/../../../types/primitives.js';

const visible = ref<IsVisible>(false);
const progress = ref(100);

let timer: NodeJS.Timeout | null = null;
const AUTO_CLOSE_MS = 4000;
const INTERVAL_MS = 50;
let elapsed = 0;

const startTimer = (): void => {
	stopTimer();
	elapsed = 0;
	progress.value = 100;
	timer = setInterval(() => {
		elapsed += INTERVAL_MS;
		progress.value = Math.max(0, 100 - (elapsed / AUTO_CLOSE_MS) * 100);
		if (elapsed >= AUTO_CLOSE_MS) {
			close();
		}
	}, INTERVAL_MS);
};

const stopTimer = (): void => {
	if (timer) {
		clearInterval(timer);
		timer = null;
	}
};

const close = (): void => {
	stopTimer();
	visible.value = false;
};

watch(visible, isShown => {
	if (isShown) {
		startTimer();
	} else {
		stopTimer();
	}
});

onMounted(() => {
	window.eyas?.receive(`show-no-update-modal` as ChannelName, () => {
		visible.value = true;
	});
});

onUnmounted(() => {
	stopTimer();
});

defineExpose({
	visible,
	progress,
	close
});
</script>
