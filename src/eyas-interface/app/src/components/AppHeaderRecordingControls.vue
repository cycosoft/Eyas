<template>
	<div class="recording-controls d-flex align-center mr-2 pa-1 rounded-lg border">
		<template v-if="isRecording || isStopped">
			<svg v-if="isPlaying" class="playback-progress" data-qa="recording-playback-progress">
				<rect pathLength="100" :style="{ strokeDashoffset: 100 - playbackProgress * 100 }" />
			</svg>
			<v-btn v-if="isRecording" icon variant="plain" :ripple="false" density="compact" class="mx-0" rounded="lg" data-qa="btn-recording-stop" @click="stopRecording">
				<v-icon icon="mdi-stop" size="small" class="recording-stop-icon" data-qa="recording-indicator" />
				<v-tooltip activator="parent" location="bottom">
					Stop Recording
				</v-tooltip>
			</v-btn>
			<v-btn v-else-if="isPlaying" icon variant="plain" :ripple="false" density="compact" class="mx-0" rounded="lg" data-qa="btn-recording-playback-stop" @click="stopPlayback">
				<v-icon icon="mdi-stop" size="small" />
				<v-tooltip activator="parent" location="bottom">
					Stop Playback
				</v-tooltip>
			</v-btn>
			<template v-else-if="isStopped">
				<v-btn icon variant="plain" :ripple="false" density="compact" class="mx-0" rounded="lg" data-qa="btn-recording-record-again" @click="startNewRecording">
					<v-icon icon="mdi-record" size="small" color="error" />
					<v-tooltip activator="parent" location="bottom">
						New Recording
					</v-tooltip>
				</v-btn>
				<v-btn icon variant="plain" :ripple="false" density="compact" class="mx-0" rounded="lg" data-qa="btn-recording-replay" @click="replayRecording">
					<v-icon icon="mdi-refresh" size="small" />
					<v-tooltip activator="parent" location="bottom">
						Replay Recording
					</v-tooltip>
				</v-btn>
			</template>
			<span v-if="playbackError" class="playback-error mx-1" data-qa="recording-playback-error">
				Replay failed
				<v-tooltip activator="parent" location="bottom">{{ playbackError }}</v-tooltip>
			</span>
			<!--
				Set when the replay starts, and deliberately left up for the rest of the run: it explains why
				the results below it may be incomplete, so it has to still be there when they're read.
			-->
			<span v-if="playbackSchemaWarning" class="playback-schema-warning mx-1" data-qa="recording-playback-schema-warning">
				<v-icon icon="mdi-alert-outline" size="small" />
				<v-tooltip activator="parent" location="bottom">
					<span class="mismatch-detail">{{ playbackSchemaWarning }}</span>
				</v-tooltip>
			</span>
			<!-- shown alongside a failure, not instead of it: a replay can fail *and* have findings -->
			<span v-if="mismatchCount > 0" class="playback-mismatch mx-1" data-qa="recording-playback-mismatches">
				{{ mismatchCount }} mismatch{{ mismatchCount === 1 ? '' : 'es' }}
				<v-tooltip activator="parent" location="bottom">
					<pre class="mismatch-detail">{{ mismatchSummary }}</pre>
				</v-tooltip>
			</span>
		</template>
		<v-btn icon variant="plain" :ripple="false" density="compact" class="mx-0" rounded="lg" data-qa="btn-recording-panel-toggle" @click="togglePanel">
			<v-icon icon="mdi-format-list-bulleted" size="small" />
			<v-tooltip activator="parent" location="bottom">
				Manage Recordings
			</v-tooltip>
		</v-btn>
	</div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import type { ChannelName } from '@registry/primitives.js';
import useRecordingStore from '@/stores/recording.js';

const recordingStore = useRecordingStore();
const { isRecording, isStopped, isPlaying, playbackProgress, playbackError, mismatchCount, mismatchSummary, playbackSchemaWarning } = storeToRefs(recordingStore);

function stopRecording(): void {
	window.eyas?.send(`recorder-stop` as ChannelName);
}

function replayRecording(): void {
	window.eyas?.send(`recorder-replay-request` as ChannelName, { sessionId: recordingStore.sessionId });
}

function stopPlayback(): void {
	window.eyas?.send(`recorder-replay-stop` as ChannelName);
}

function startNewRecording(): void {
	window.eyas?.send(`recorder-record-start` as ChannelName);
}

function togglePanel(): void {
	recordingStore.togglePanel();
}
</script>

<style scoped>
.recording-controls { position: relative; }
.recording-stop-icon { color: #e53935; animation: recording-pulse 1.5s infinite; }
@keyframes recording-pulse { 0% { opacity: 1; } 50% { opacity: 0.35; } 100% { opacity: 1; } }
.playback-error { font-size: 12px; color: #e53935; }
/* amber, not red: a mismatch is a finding to look at, not a broken replay */
.playback-mismatch { font-size: 12px; color: #fb8c00; cursor: default; }
/* same amber as a mismatch — both mean "look at this", neither means the replay broke */
.playback-schema-warning { color: #fb8c00; cursor: default; }
.mismatch-detail { font-size: 11px; margin: 0; white-space: pre-wrap; font-family: inherit; }
.playback-progress { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.playback-progress rect {
	x: 1px; y: 1px; width: calc(100% - 2px); height: calc(100% - 2px); rx: 8px;
	fill: none; stroke: rgb(var(--v-theme-primary)); stroke-width: 2px;
	stroke-dasharray: 100; transition: stroke-dashoffset 200ms linear;
}
</style>
