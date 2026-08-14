<template>
	<EyasModal v-model="isOpen" mode="panel">
		<template #title>
			<div class="d-flex align-center justify-space-between">
				<h2 class="font-headline text-h6 font-weight-bold text-on-surface" data-qa="recording-panel-title">
					{{ selectedSession ? formatTitle(selectedSession.title) : `${savedSessions.length.toLocaleString()} Recordings` }}
				</h2>
				<v-btn icon variant="plain" :ripple="false" density="compact" class="mx-0" rounded="lg" data-qa="btn-recording-panel-close" @click="close">
					<v-icon icon="mdi-close" size="small" />
				</v-btn>
			</div>
		</template>

		<div v-if="!selectedSession" data-qa="recording-panel-browser">
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
				All Recordings
			</button>

			<p
				v-if="testDate !== formatTitle(selectedSession.title)"
				class="font-body text-caption text-grey-darken-1 mb-4"
				data-qa="recording-detail-meta"
			>
				{{ testDate }}
			</p>

			<p v-if="!selectedSessionDetail" class="font-body text-body-2 text-grey-darken-1" data-qa="recording-detail-loading">
				Loading steps...
			</p>
			<v-timeline
				v-else-if="selectedSessionDetail.recording.steps.length > 0"
				data-qa="recording-detail-steps"
				density="compact"
				align="start"
				side="end"
				truncate-line="both"
				line-color="grey-lighten-2"
			>
				<v-timeline-item
					v-for="(step, index) in selectedSessionDetail.recording.steps"
					:key="index"
					:icon="stepIcon(step)"
					icon-color="white"
					dot-color="primary"
					size="small"
					fill-dot
				>
					<div class="font-body text-body-2 font-weight-medium text-on-surface" data-qa="recording-step-title">
						{{ describeStep(step) }}
					</div>
					<div v-if="stepDetail(step)" class="font-body text-caption text-grey-darken-1" data-qa="recording-step-detail">
						{{ stepDetail(step) }}
					</div>
				</v-timeline-item>
			</v-timeline>
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
import type { IsVisible, ChannelName, IconName } from '@registry/primitives.js';
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

const testDate = computed<DetailText | undefined>(() => {
	return selectedSession.value ? new Date(selectedSession.value.startedAt).toLocaleString() : undefined;
});

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

function stepIcon(step: RecordingStep): IconName {
	switch (step.type) {
	case `click`: return step.button === `secondary` ? `mdi-cursor-default-click-outline` : `mdi-cursor-default-click`;
	case `change`: return `mdi-form-textbox`;
	case `editableChange`: return `mdi-text-box-edit-outline`;
	case `editableInput`: return `mdi-text-box-edit-outline`;
	case `keyDown`: return `mdi-keyboard-outline`;
	case `keyUp`: return `mdi-keyboard-outline`;
	case `scroll`: return `mdi-gesture-swipe-vertical`;
	case `navigate`: return `mdi-compass-outline`;
	case `closeWindow`: return `mdi-close-box-outline`;
	default: return `mdi-circle-small`;
	}
}

function stepDetail(step: RecordingStep): DetailText | undefined {
	switch (step.type) {
	case `click`: return step.selectors[0];
	case `change`: return step.value;
	case `editableChange`: return step.text;
	case `editableInput`: return step.data;
	case `scroll`: return `x: ${step.x}, y: ${step.y}`;
	default: return undefined;
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

:deep(.v-timeline-item__body) {
	overflow-wrap: anywhere;
}
</style>
