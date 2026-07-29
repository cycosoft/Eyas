<template>
	<svg
		v-if="isVisible"
		data-qa="test-running-ring"
		class="test-running-ring"
		:style="ringStyle"
	>
		<defs>
			<filter
				id="test-running-ring-turbulence"
				x="-20%"
				y="-20%"
				width="140%"
				height="140%"
			>
				<feTurbulence
					type="fractalNoise"
					baseFrequency="0.01 0.025"
					numOctaves="3"
					seed="7"
					result="noise"
				>
					<animate
						attributeName="baseFrequency"
						values="0.008 0.02;0.014 0.03;0.009 0.022;0.008 0.02"
						dur="19s"
						repeatCount="indefinite"
					/>
				</feTurbulence>
				<feDisplacementMap
					in="SourceGraphic"
					in2="noise"
					scale="10"
					xChannelSelector="R"
					yChannelSelector="G"
				/>
			</filter>

			<linearGradient
				id="test-running-ring-gradient"
				gradientUnits="objectBoundingBox"
			>
				<stop offset="0%" stop-color="rgb(var(--v-theme-primary))">
					<animate attributeName="stop-opacity" values="0.7;1;0.8;1;0.7" dur="9s" repeatCount="indefinite" />
				</stop>
				<stop offset="35%" stop-color="rgb(var(--v-theme-secondary))">
					<animate attributeName="stop-opacity" values="1;0.7;1;0.8;1" dur="13s" repeatCount="indefinite" />
				</stop>
				<stop offset="65%" stop-color="rgb(var(--v-theme-success))">
					<animate attributeName="stop-opacity" values="0.8;1;0.7;1;0.8" dur="11s" repeatCount="indefinite" />
				</stop>
				<stop offset="100%" stop-color="rgb(var(--v-theme-primary))">
					<animate attributeName="stop-opacity" values="1;0.8;1;0.7;1" dur="17s" repeatCount="indefinite" />
				</stop>
				<animateTransform
					attributeName="gradientTransform"
					type="rotate"
					from="0 0.5 0.5"
					to="360 0.5 0.5"
					dur="34s"
					repeatCount="indefinite"
				/>
			</linearGradient>
		</defs>

		<rect
			class="test-running-ring__glow test-running-ring__glow--outer"
			x="0"
			y="0"
			width="100%"
			height="100%"
		/>
		<rect
			class="test-running-ring__glow test-running-ring__glow--core"
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

.test-running-ring__glow {
	fill: none;
	stroke: url(#test-running-ring-gradient);
	vector-effect: non-scaling-stroke;
}

.test-running-ring__glow--outer {
	stroke-width: 26;
	opacity: 0.6;
	filter: url(#test-running-ring-turbulence) blur(9px);
}

.test-running-ring__glow--core {
	stroke-width: 8;
	opacity: 1;
	filter: url(#test-running-ring-turbulence) blur(1.5px);
}
</style>
