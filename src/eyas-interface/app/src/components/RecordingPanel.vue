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

		<div v-else ref="detailContainerEl" data-qa="recording-panel-detail">
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
					:dot-color="stepDotColorFor(stepDotClass(index))"
					size="small"
					fill-dot
					:class="`step-dot--${stepDotClass(index)}`"
				>
					<!--
						v-timeline-item's own root renders with `display: contents` (VTimeline.css), which
						generates no box — getBoundingClientRect/scrollIntoView on that element are unreliable
						across Chromium versions. This wrapper div is a real boxed descendant to anchor on instead.
					-->
					<div :data-step-index="index">
						<div class="font-body text-body-2 font-weight-medium text-on-surface step-timeline-title" data-qa="recording-step-title">
							{{ describeStep(step) }}
						</div>
						<div v-if="stepDetail(step)" class="font-body text-caption text-grey-darken-1 step-timeline-detail" data-qa="recording-step-detail">
							{{ stepDetail(step) }}
						</div>
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
import { computed, nextTick, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import EyasModal from '@/components/EyasModal.vue';
import useRecordingStore from '@/stores/recording.js';
import { stepDotClassFor, stepDotColorFor, type StepDotClass } from '@/utils/step-dot.utils.js';
import { describeStep, stepIcon, stepDetail } from '@/utils/step-format.utils.js';
import type { IsVisible, IsActive, ChannelName, Count } from '@registry/primitives.js';
import type { RecordingSessionSummary } from '@registry/ipc.js';
import type { DetailText, StepIndex } from '@registry/primitives.js';

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
// Also refetches this session's per-step outcomes for the detail view's icons, which would
// otherwise keep showing the *previous* run's colors the instant isPlaying flips false.
watch(() => recordingStore.playbackStatus, (status, prevStatus) => {
	if (!isOpen.value || prevStatus !== `playing` || status === `playing`) { return; }
	window.eyas?.send(`recorder-list-sessions` as ChannelName);
	if (selectedSession.value) {
		window.eyas?.send(`recorder-get-run-steps` as ChannelName, { sessionId: selectedSession.value.sessionId } as RecorderGetRunStepsPayload);
	}
});

watch(selectedSession, session => {
	if (session) {
		window.eyas?.send(`recorder-get-session` as ChannelName, { sessionId: session.sessionId } as RecorderGetSessionPayload);
		window.eyas?.send(`recorder-get-run-steps` as ChannelName, { sessionId: session.sessionId } as RecorderGetRunStepsPayload);
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

// View-anchored: only colors icons for the detail view's own session, matching the currently
// active recording/playback instance — a different session's icons stay neutral even if this
// instance happens to be recording/playing something else (which can't currently overlap this
// view being open on it, but the guard is cheap and keeps the intent explicit).
const isActiveSession = computed<IsActive>(() => !!selectedSession.value && recordingStore.sessionId === selectedSession.value.sessionId);

const detailContainerEl = ref<HTMLElement | null>(null);

// Keeps the actively-dispatching step visible while a watched playback runs, so the tester doesn't
// have to manually scroll the detail view to follow along. Only follows the panel's own active
// session (isActiveSession), matching the view-anchored scoping used for step icon coloring above.
watch(() => recordingStore.currentStepIndex, async currentStepIndex => {
	if (currentStepIndex === null || !isActiveSession.value || !recordingStore.isPlaying) { return; }
	await nextTick();
	const stepEl = detailContainerEl.value?.querySelector(`[data-step-index="${currentStepIndex}"]`);
	stepEl?.scrollIntoView({ behavior: `smooth`, block: `center` });
});

function stepDotClass(stepIndex: StepIndex): StepDotClass {
	const totalSteps = (selectedSessionDetail.value?.recording.steps.length ?? 0) as Count;
	const recording = isActiveSession.value && recordingStore.isRecording ? { totalSteps } : null;
	const playing = isActiveSession.value && recordingStore.isPlaying
		? { currentStepIndex: recordingStore.currentStepIndex, playbackMismatches: recordingStore.playbackMismatches }
		: null;
	const runStepOutcomes = recordingStore.runStepOutcomes?.finished ? recordingStore.runStepOutcomes.outcomes : null;
	return stepDotClassFor(stepIndex, recording, playing, runStepOutcomes);
}

function formatTitle(isoTitle: RecordingSessionSummary[`title`]): DetailText {
	const parsed = new Date(isoTitle);
	return Number.isNaN(parsed.getTime()) ? isoTitle : parsed.toLocaleString();
}

const testDate = computed<DetailText | undefined>(() => {
	return selectedSession.value ? new Date(selectedSession.value.startedAt).toLocaleString() : undefined;
});

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

/* Per-step blink — base color already comes from the bound dot-color prop (stepDotColorFor);
   Vuetify's dot-color alone can't carry an animation, so the pulse is layered on via :deep(),
   reusing the same @keyframes recording-pulse the list row's blinking dot already uses. */
.step-dot--recording-active :deep(.v-timeline-divider__dot),
.step-dot--playing-active :deep(.v-timeline-divider__dot) {
	animation: recording-pulse 1.5s infinite;
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
