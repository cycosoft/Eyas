<template>
	<svg
		v-if="isVisible"
		data-qa="test-running-ring"
		class="test-running-ring"
		:style="ringStyle"
	>
		<rect
			class="test-running-ring__track"
			x="1"
			y="1"
			width="99%"
			height="99%"
			pathLength="100"
		/>
		<rect
			class="test-running-ring__sweep"
			x="1"
			y="1"
			width="99%"
			height="99%"
			pathLength="100"
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
	overflow: visible;
}

.test-running-ring__track {
	fill: none;
	stroke: rgba(var(--v-theme-primary), 0.2);
	stroke-width: 2;
	vector-effect: non-scaling-stroke;
}

.test-running-ring__sweep {
	fill: none;
	stroke: rgb(var(--v-theme-primary));
	stroke-width: 2;
	stroke-dasharray: 20 80;
	vector-effect: non-scaling-stroke;
	animation: test-running-ring-travel 2s linear infinite;
}

@keyframes test-running-ring-travel {
	from { stroke-dashoffset: 0; }
	to { stroke-dashoffset: -100; }
}
</style>
