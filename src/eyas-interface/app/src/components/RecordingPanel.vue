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

		<div v-if="!selectedSession" data-qa="recording-panel-browser">
			<div class="d-flex align-center justify-space-between mb-3">
				<span class="font-body text-caption text-grey-darken-1" data-qa="recording-panel-total">
					{{ savedSessions.length }} total
				</span>
			</div>

			<v-text-field
				disabled
				density="compact"
				variant="outlined"
				placeholder="Global Search (Ctrl + K)"
				prepend-inner-icon="mdi-magnify"
				hide-details
				class="mb-3"
				data-qa="recording-panel-search"
			/>

			<p v-if="savedSessions.length === 0" class="font-body text-body-2 text-grey-darken-1" data-qa="recording-panel-empty">
				No recordings found yet. Start a recording to see it listed here.
			</p>

			<ul v-else class="recording-list" data-qa="recording-panel-list">
				<li
					v-for="session in savedSessions"
					:key="session.sessionId"
					class="recording-row"
					:data-qa="`recording-row-${session.sessionId}`"
					@click="recordingStore.selectSession(session.sessionId)"
				>
					<span class="status-dot" :class="`status-dot--${session.status}`" />
					<span class="recording-row__info">
						<span class="font-body text-body-2 font-weight-medium text-on-surface">{{ formatTitle(session.title) }}</span>
						<span class="font-body text-caption text-grey-darken-1">{{ session.stepCount }} step{{ session.stepCount === 1 ? `` : `s` }}</span>
					</span>
					<v-icon icon="mdi-chevron-right" size="small" />
				</li>
			</ul>
		</div>

		<div v-else data-qa="recording-panel-detail">
			<button type="button" class="back-link font-body text-body-2 mb-3" data-qa="btn-recording-panel-back" @click="recordingStore.backToBrowser">
				<v-icon icon="mdi-arrow-left" size="small" />
				Back to Browser
			</button>

			<h3 class="font-headline text-subtitle-1 font-weight-bold text-on-surface mb-1" data-qa="recording-detail-title">
				{{ formatTitle(selectedSession.title) }}
			</h3>
			<p class="font-body text-caption text-grey-darken-1 mb-4" data-qa="recording-detail-meta">
				ID: {{ selectedSession.sessionId }}
			</p>

			<p v-if="!selectedSessionDetail" class="font-body text-body-2 text-grey-darken-1" data-qa="recording-detail-loading">
				Loading steps...
			</p>
			<ol v-else-if="selectedSessionDetail.recording.steps.length > 0" class="step-timeline" data-qa="recording-detail-steps">
				<li v-for="(step, index) in selectedSessionDetail.recording.steps" :key="index" class="step-timeline__item">
					<span class="step-timeline__marker" />
					<span class="font-body text-body-2 text-on-surface">{{ describeStep(step) }}</span>
				</li>
			</ol>
			<p v-else class="font-body text-body-2 text-grey-darken-1" data-qa="recording-detail-empty">
				This recording has no steps.
			</p>
		</div>
	</EyasModal>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import EyasModal from '@/components/EyasModal.vue';
import useRecordingStore from '@/stores/recording.js';
import type { IsVisible, ChannelName } from '@registry/primitives.js';
import type { RecordingStep } from '@registry/recording.js';
import type { RecorderGetSessionPayload, RecordingSessionSummary } from '@registry/ipc.js';
import type { DetailText } from '@registry/primitives.js';

const recordingStore = useRecordingStore();
const { savedSessions, selectedSession, selectedSessionDetail } = storeToRefs(recordingStore);

const isOpen = computed<IsVisible>({
	get: () => recordingStore.isPanelOpen,
	set: (value: IsVisible) => {
		recordingStore.isPanelOpen = value;
	}
});

const close = (): void => {
	recordingStore.isPanelOpen = false;
};

watch(isOpen, open => {
	if (open) { window.eyas?.send(`recorder-list-sessions` as ChannelName); }
}, { immediate: true });

watch(selectedSession, session => {
	if (session) {
		window.eyas?.send(`recorder-get-session` as ChannelName, { sessionId: session.sessionId } as RecorderGetSessionPayload);
	}
});

function formatTitle(isoTitle: RecordingSessionSummary[`title`]): DetailText {
	const parsed = new Date(isoTitle);
	return Number.isNaN(parsed.getTime()) ? isoTitle : parsed.toLocaleString();
}

function describeStep(step: RecordingStep): DetailText {
	switch (step.type) {
	case `click`: return step.button === `secondary` ? `Right click` : `Click`;
	case `change`: return `Enter text`;
	case `editableChange`: return `Edit rich text`;
	case `editableInput`: return `Type into editor`;
	case `keyDown`: return `Key press: ${step.key}`;
	case `keyUp`: return `Key release: ${step.key}`;
	case `scroll`: return `Scroll`;
	case `navigate`: return `Navigate to ${step.url}`;
	case `closeWindow`: return `Close window`;
	default: return `Step`;
	}
}
</script>

<style scoped>
.recording-list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.recording-row {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.5rem 0.25rem;
	border-bottom: 1px solid rgba(0, 0, 0, 0.06);
	cursor: pointer;
}

.recording-row:hover {
	background: rgba(0, 0, 0, 0.03);
}

.recording-row__info {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	min-width: 0;
}

.status-dot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
}

.status-dot--recording { background: #e53935; }
.status-dot--stopped { background: #9e9e9e; }

.back-link {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	background: none;
	border: none;
	padding: 0;
	color: var(--modal-primary, #58A1D6);
	cursor: pointer;
}

.step-timeline {
	list-style: none;
	margin: 0;
	padding: 0;
}

.step-timeline__item {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.4rem 0;
}

.step-timeline__marker {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: #9e9e9e;
	flex-shrink: 0;
}
</style>
