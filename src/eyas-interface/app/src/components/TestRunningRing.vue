<template>
	<recording-ring
		v-if="shouldRender"
		data-qa="test-running-ring"
		class="test-running-ring"
		:class="{ 'test-running-ring--faded-in': isFadedIn }"
		:style="ringStyle"
	/>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import useRecordingStore from '@/stores/recording.js';
import { state as headerState } from './AppHeader.logic.js';
import { defineRecordingRingElement } from '@/web-components/recording-ring.element.js';
import { EYAS_HEADER_HEIGHT, TEST_RUNNING_RING_FADE_MS } from '@scripts/constants.js';
import type { DurationMS, TimerId } from '@registry/primitives.js';

defineRecordingRingElement();

const RING_FADE_MS: DurationMS = TEST_RUNNING_RING_FADE_MS;

const recordingStore = useRecordingStore();
const { isPlaying } = storeToRefs(recordingStore);

const isVisible = computed(() => isPlaying.value && !!headerState.currentViewport);

// kept mounted through the fade-out CSS transition instead of vanishing with `isVisible` —
// the svg is removed from the DOM only once the leave transition has had time to finish
const shouldRender = ref(isVisible.value);
const isFadedIn = ref(false);
let fadeOutTimer: TimerId | null = null;

watch(isVisible, visible => {
	if (visible) {
		if (fadeOutTimer) { clearTimeout(fadeOutTimer); fadeOutTimer = null; }
		shouldRender.value = true;
		// a single nextTick/rAF can still land in the same paint as the DOM insert, so the
		// browser never observes the opacity: 0 starting frame and has nothing to transition
		// from — two nested rAFs guarantee a real paint happens in between
		requestAnimationFrame(() => { requestAnimationFrame(() => { isFadedIn.value = true; }); });
		return;
	}

	isFadedIn.value = false;
	fadeOutTimer = setTimeout(() => {
		shouldRender.value = false;
		fadeOutTimer = null;
	}, RING_FADE_MS);
}, { immediate: true });

onBeforeUnmount(() => {
	if (fadeOutTimer) { clearTimeout(fadeOutTimer); }
});

const ringStyle = computed(() => {
	const [width, height] = headerState.currentViewport ?? [0, 0];
	return {
		top: `${EYAS_HEADER_HEIGHT}px`,
		left: `0px`,
		width: `${width}px`,
		height: `${height}px`,
		'--recording-ring-color-1': `rgb(var(--v-theme-primary))`,
		'--recording-ring-color-2': `rgb(var(--v-theme-secondary))`,
		'--recording-ring-color-3': `rgb(var(--v-theme-success))`
	};
});
</script>

<style scoped>
.test-running-ring {
	position: fixed;
	pointer-events: none;
	z-index: 9999;
	opacity: 0;
	transition: opacity 250ms ease;
}

.test-running-ring--faded-in {
	opacity: 1;
}
</style>
