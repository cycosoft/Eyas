<template>
	<svg
		v-if="isVisible"
		data-qa="test-running-ring"
		class="test-running-ring"
		:style="ringStyle"
	>
		<rect
			class="test-running-ring__glow"
			x="0"
			y="0"
			width="100%"
			height="100%"
		/>
	</svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import useRecordingStore from '@/stores/recording.js';
import { state as headerState } from './AppHeader.logic.js';
import { EYAS_HEADER_HEIGHT } from '@scripts/constants.js';

const recordingStore = useRecordingStore();
const { isPlaying } = storeToRefs(recordingStore);

const isVisible = computed(() => isPlaying.value && !!headerState.currentViewport);

const ringStyle = computed(() => {
	const [width, height] = headerState.currentViewport ?? [0, 0];
	return {
		top: `${EYAS_HEADER_HEIGHT}px`,
		left: `0px`,
		width: `${width}px`,
		height: `${height}px`
	};
});
</script>

<style scoped>
.test-running-ring {
	position: fixed;
	pointer-events: none;
	z-index: 9999;
	overflow: hidden;
}

/* a soft glow around all four edges at once, breathing in place - no travel/motion */
.test-running-ring__glow {
	fill: none;
	stroke: rgb(var(--v-theme-primary));
	stroke-width: 6;
	vector-effect: non-scaling-stroke;
	filter: blur(6px);
	animation: test-running-ring-breathe 3s ease-in-out infinite;
}

@keyframes test-running-ring-breathe {
	0%, 100% { opacity: 0.55; }
	50% { opacity: 1; }
}
</style>
