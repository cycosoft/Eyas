<template>
	<div v-if="isRecording || isStopped" class="d-flex align-center mr-2 pa-1 rounded-lg border">
		<span v-if="isRecording" class="recording-dot mx-1" data-qa="recording-indicator" />
		<v-btn v-if="isRecording" icon variant="plain" :ripple="false" density="compact" class="mx-0" rounded="lg" data-qa="btn-recording-stop" @click="stopRecording">
			<v-icon icon="mdi-stop" size="small" />
		</v-btn>
		<v-btn v-else-if="isStopped" icon variant="plain" :ripple="false" density="compact" class="mx-0" rounded="lg" data-qa="btn-recording-replay" @click="replayRecording">
			<v-icon icon="mdi-play" size="small" />
		</v-btn>
	</div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import type { ChannelName } from '@registry/primitives.js';
import useRecordingStore from '@/stores/recording.js';

const recordingStore = useRecordingStore();
const { isRecording, isStopped } = storeToRefs(recordingStore);

function stopRecording(): void {
	window.eyas?.send(`recorder-stop` as ChannelName);
}

function replayRecording(): void {
	window.eyas?.send(`recorder-replay-request` as ChannelName, { sessionId: recordingStore.sessionId });
}
</script>

<style scoped>
.recording-dot { width: 8px; height: 8px; border-radius: 50%; background-color: #e53935; animation: recording-pulse 1.5s infinite; }
@keyframes recording-pulse { 0% { opacity: 1; } 50% { opacity: 0.35; } 100% { opacity: 1; } }
</style>
