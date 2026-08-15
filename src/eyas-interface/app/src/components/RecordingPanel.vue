<template>
	<EyasModal v-model="isOpen" mode="panel">
		<template #title>
			<div class="d-flex align-start justify-space-between">
				<div class="flex-grow-1 recording-panel-title-column">
					<button
						v-if="selectedSession"
						type="button"
						class="back-link font-body text-body-2 mb-2"
						data-qa="btn-recording-panel-back"
						@click="recordingStore.backToBrowser"
					>
						<v-icon icon="mdi-arrow-left" size="small" />
						All Recordings
					</button>
					<h2 class="font-headline text-h6 font-weight-bold text-on-surface" data-qa="recording-panel-title">
						{{ selectedSession ? formatTitle(selectedSession.title) : `${savedSessions.length.toLocaleString()} Recordings` }}
					</h2>
				</div>
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
					<span class="status-dot" :class="`status-dot--${dotClassFor(session)}`" />
					<span class="recording-row__info">
						<span class="font-body text-body-2 font-weight-medium text-on-surface">{{ formatTitle(session.title) }}</span>
						<span class="font-body text-caption text-grey-darken-1">{{ session.stepCount }} step{{ session.stepCount === 1 ? `` : `s` }}</span>
					</span>
					<v-icon icon="mdi-chevron-right" size="small" />
				</li>
			</ul>
		</div>

		<div v-else data-qa="recording-panel-detail">
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
					<div class="font-body text-body-2 font-weight-medium text-on-surface step-timeline-title" data-qa="recording-step-title">
						{{ describeStep(step) }}
					</div>
					<div v-if="stepDetail(step)" class="font-body text-caption text-grey-darken-1 step-timeline-detail" data-qa="recording-step-detail">
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
import type { RecordingStep, ScopedSelectorPayload, SelectorGroup } from '@registry/recording.js';
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

// Refreshes lastRunOutcome the moment a watched playback finishes, so a row doesn't sit stale until the panel is closed and reopened.
watch(() => recordingStore.playbackStatus, (status, prevStatus) => {
	if (isOpen.value && prevStatus === `playing` && status !== `playing`) { window.eyas?.send(`recorder-list-sessions` as ChannelName); }
});

watch(selectedSession, session => {
	if (session) {
		window.eyas?.send(`recorder-get-session` as ChannelName, { sessionId: session.sessionId } as RecorderGetSessionPayload);
	}
});

// Live blink takes priority over last-run status, and is local-instance only (recording/playback state is never shared across Eyas processes).
function dotClassFor(session: RecordingSessionSummary): `recording` | `playing` | `passed` | `failed` | `neutral` {
	if (recordingStore.isRecording && recordingStore.sessionId === session.sessionId) { return `recording`; }
	if (recordingStore.isPlaying && recordingStore.sessionId === session.sessionId) { return `playing`; }
	if (session.lastRunOutcome === `passed`) { return `passed`; }
	if (session.lastRunOutcome === `failed`) { return `failed`; }
	return `neutral`;
}

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
	case `navigate`: return `Navigate to`;
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
	case `click`: return humanizeSelector(step.selectors);
	case `change`: return step.value;
	case `editableChange`: return step.text;
	case `editableInput`: return step.data;
	case `scroll`: return `x: ${step.x}, y: ${step.y}`;
	case `navigate`: return humanizeUrl(step.url);
	default: return undefined;
	}
}

// Turns a step's best selector candidate into plain English — testers only care that it was "Submit", not that it matched via `aria/Submit`. Falls back to the raw candidate for a bare CSS selector, which has no prefix to strip.
function humanizeSelector(selectors: SelectorGroup): DetailText | undefined {
	const selector = selectors[0];
	if (!selector) { return undefined; }

	const separatorIndex = selector.indexOf(`/`);
	if (separatorIndex === -1) { return selector; }

	const prefix = selector.slice(0, separatorIndex);
	const value = selector.slice(separatorIndex + 1);

	if (prefix === `scoped-aria` || prefix === `scoped-text`) {
		try {
			return (JSON.parse(value) as ScopedSelectorPayload).name;
		} catch {
			return value;
		}
	}

	return value || selector;
}

/** Shows only the part of a navigated-to URL a tester cares about: the path, not the domain they were already on. */
function humanizeUrl(url: DetailText): DetailText {
	try {
		const parsed = new URL(url);
		return `${parsed.pathname}${parsed.search}` || `/`;
	} catch {
		return url;
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

.status-dot--neutral { background: #9e9e9e; }
.status-dot--passed { background: #43a047; }
.status-dot--failed { background: #e53935; }
/* recording/playing timing mirrors the header's recording indicator (AppHeaderRecordingControls.vue) — scoped styles can't be shared across components */
.status-dot--recording { background: #e53935; animation: recording-pulse 1.5s infinite; }
.status-dot--playing { background: rgb(var(--v-theme-primary)); animation: recording-pulse 1.5s infinite; }
@keyframes recording-pulse { 0% { opacity: 1; } 50% { opacity: 0.35; } 100% { opacity: 1; } }

.recording-panel-title-column {
	min-width: 0;
}

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
	padding-block-end: 0.75rem;
}

.step-timeline-title {
	font-size: 0.8125rem;
	line-height: 1.3;
}

.step-timeline-detail {
	font-size: 0.75rem;
	line-height: 1.3;
	margin-top: 0.125rem;
}
</style>
