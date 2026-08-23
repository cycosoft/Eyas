<template>
	<EyasModal v-model="isOpen" mode="panel">
		<template #title>
			<div class="d-flex flex-column recording-panel-text">
				<div class="d-flex align-start justify-end">
					<button v-if="selectedSession" type="button" class="back-link font-body text-body-2 mb-2 flex-grow-1" data-qa="btn-recording-panel-back" @click="recordingStore.backToBrowser">
						<v-icon icon="mdi-arrow-left" size="small" />
						All Recordings
					</button>
					<h2 v-else class="font-headline text-h6 font-weight-bold text-on-surface flex-grow-1" data-qa="recording-panel-title">
						{{ `${savedSessions.length.toLocaleString()} Recordings` }}
					</h2>
					<v-btn icon variant="plain" :ripple="false" density="compact" class="mx-0" rounded="lg" data-qa="btn-recording-panel-close" @click="close">
						<v-icon icon="mdi-close" size="small" />
					</v-btn>
				</div>
				<div v-if="selectedSession" class="d-flex align-center justify-space-between recording-panel-title-column">
					<h2 class="font-headline text-h6 font-weight-bold text-on-surface" data-qa="recording-panel-title">
						{{ formatTitle(selectedSession.title) }}
					</h2>
					<v-btn icon variant="plain" :ripple="false" density="compact" class="mx-0" rounded="lg" data-qa="btn-recording-detail-menu">
						<v-icon icon="mdi-dots-vertical" size="small" />
						<v-menu v-model="isDetailMenuOpen" activator="parent" location="bottom end">
							<v-list density="compact" rounded="lg" border>
								<v-list-item slim :disabled="isSelectedSessionBusy" data-qa="recording-detail-menu-delete" @click="deleteSelectedSession">
									Delete Recording
								</v-list-item>
							</v-list>
						</v-menu>
					</v-btn>
				</div>
			</div>
		</template>

		<div v-if="!selectedSession" data-qa="recording-panel-browser">
			<p v-if="savedSessions.length === 0" class="font-body text-body-2 text-grey-darken-1 recording-panel-text" data-qa="recording-panel-empty">
				No recordings found yet. Start a recording to see it listed here.
			</p>

			<ul v-else class="recording-list" data-qa="recording-panel-list">
				<SelectableCard
					v-for="session in savedSessions"
					:key="session.sessionId"
					tag="li"
					class="recording-card"
					:class="[`recording-card--${dotClassFor(session)}`, { 'recording-card--pinned': isPinned(session) }]"
					:accent-color="accentColorFor(dotClassFor(session))"
					persist-icon
					:data-qa="`recording-row-${session.sessionId}`"
					@click="recordingStore.selectSession(session.sessionId)"
				>
					<template #icon>
						<v-icon :icon="cardIconFor(dotClassFor(session))" size="small" class="recording-card__icon-glyph" />
					</template>
					<span class="font-body text-body-2 font-weight-medium text-on-surface recording-panel-text">{{ formatTitle(session.title) }}</span>
					<span class="font-body text-caption text-grey-darken-1 recording-panel-text">
						{{ session.stepCount }} step{{ session.stepCount === 1 ? `` : `s` }}
						<span v-if="statusLabelFor(dotClassFor(session))" class="recording-card__status" :class="`recording-card__status--${dotClassFor(session)}`">
							&nbsp;&bull; {{ statusLabelFor(dotClassFor(session)) }}
						</span>
					</span>
					<template #trailing>
						<span class="selectable-card__trailing">
							<v-icon icon="mdi-chevron-right" size="small" class="recording-card__chevron selectable-card__trailing-rest" />
							<v-btn
								v-if="session.stepCount > 0 || dotClassFor(session) === `recording` || dotClassFor(session) === `playing`"
								icon
								variant="plain"
								:ripple="false"
								density="compact"
								rounded="lg"
								class="mx-0 recording-card__action selectable-card__trailing-hover"
								:class="`recording-card__action--${dotClassFor(session)}`"
								:data-qa="`recording-row-action-${session.sessionId}`"
								@click.stop="onActionClick(session)"
							>
								<v-icon :icon="actionIconFor(dotClassFor(session))" size="small" />
							</v-btn>
						</span>
					</template>
				</SelectableCard>
			</ul>
		</div>

		<div v-else ref="detailContainerEl" data-qa="recording-panel-detail" @wheel="interruptAutoScroll" @touchmove="interruptAutoScroll">
			<p
				v-if="testDate !== formatTitle(selectedSession.title)"
				class="font-body text-caption text-grey-darken-1 mb-4 recording-panel-text"
				data-qa="recording-detail-meta"
			>
				{{ testDate }}
			</p>

			<p v-if="!selectedSessionDetail" class="font-body text-body-2 text-grey-darken-1 recording-panel-text" data-qa="recording-detail-loading">
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
						<div class="font-body text-body-2 font-weight-medium text-on-surface step-timeline-title recording-panel-text" data-qa="recording-step-title">
							{{ describeStep(step) }}
						</div>
						<div v-if="stepDetail(step)" class="font-body text-caption text-grey-darken-1 step-timeline-detail recording-panel-text" data-qa="recording-step-detail">
							{{ stepDetail(step) }}
						</div>
					</div>
				</v-timeline-item>
			</v-timeline>
			<p v-else class="font-body text-body-2 text-grey-darken-1 recording-panel-text" data-qa="recording-detail-empty">
				This recording has no steps.
			</p>
		</div>

		<!-- Nested (not a template sibling) so Vuetify's provide/inject overlay stack treats it as a child dialog — a sibling left the panel as its own "local top", closing itself on any click inside this one. -->
		<RecordingDeleteModal v-model="isDeleteConfirmOpen" @confirm="confirmDeleteSelectedSession" />
		<RecordingInterruptModal v-model="isInterruptConfirmOpen" @confirm="confirmInterrupt" />
	</EyasModal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import EyasModal from '@/components/EyasModal.vue';
import RecordingDeleteModal from '@/components/RecordingDeleteModal.vue';
import RecordingInterruptModal from '@/components/RecordingInterruptModal.vue';
import SelectableCard from '@/components/SelectableCard.vue';
import useRecordingStore from '@/stores/recording.js';
import useRecordingDeletion from '@/composables/useRecordingDeletion.js';
import useRecordingRowStatus from '@/composables/useRecordingRowStatus.js';
import { stepDotClassFor, stepDotColorFor, firstFailingStepIndex, type StepDotClass } from '@/utils/step-dot.utils.js';
import { describeStep, stepIcon, stepDetail } from '@/utils/step-format.utils.js';
import { cardIconFor, accentColorFor, actionIconFor, statusLabelFor } from '@/utils/recording-card.utils.js';
import type { IsVisible, IsActive, ChannelName, Count } from '@registry/primitives.js';
import type { RecordingSessionSummary, RecorderRunStepsLoadedPayload } from '@registry/ipc.js';
import type { EyasRecordingEnvelope } from '@registry/recording.js';
import type { DetailText, StepIndex } from '@registry/primitives.js';
import type { RecordingState } from '@/types/recording.js';

const recordingStore = useRecordingStore();
const { savedSessions, selectedSession, selectedSessionDetail } = storeToRefs(recordingStore);

const isOpen = computed<IsVisible>({
	get: () => recordingStore.isPanelOpen,
	set: (value: IsVisible) => { recordingStore.isPanelOpen = value; }
});

const close = (): void => { recordingStore.isPanelOpen = false; };

watch(isOpen, open => {
	if (open) { window.eyas?.send(`recorder-list-sessions` as ChannelName); }
}, { immediate: true });

// Refreshes lastRunOutcome the moment a watched playback finishes, so a row doesn't sit stale until the panel is closed and reopened.
// Also refetches this session's per-step outcomes for the detail view's icons, which would
// otherwise keep showing the *previous* run's colors the instant isPlaying flips false.
// Watches sessionId alongside status (not status alone): an interrupted playback's `stopped` and the
// session that interrupted it starting `playing` can both land before Vue's next flush, so a
// status-only watcher would see playing -> playing and skip the refresh the interrupted row needs.
watch([(): RecordingState[`playbackStatus`] => recordingStore.playbackStatus, (): RecordingState[`sessionId`] => recordingStore.sessionId], ([status, sessionId], [prevStatus, prevSessionId]): void => {
	if (!isOpen.value || prevStatus !== `playing`) { return; }
	const interruptedByAnotherSession = sessionId !== prevSessionId;
	if (status === `playing` && !interruptedByAnotherSession) { return; }
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

const { dotClassFor, isPinned, onActionClick, isInterruptConfirmOpen, confirmInterrupt } = useRecordingRowStatus(recordingStore);

// View-anchored: only colors icons for the detail view's own session, matching the active recording/playback instance; other sessions stay neutral.
const isActiveSession = computed<IsActive>(() => !!selectedSession.value && recordingStore.sessionId === selectedSession.value.sessionId);

const detailContainerEl = ref<HTMLElement | null>(null);
const isDetailMenuOpen = ref<IsActive>(false);

const {
	isDeleteConfirmOpen,
	isSelectedSessionBusy,
	deleteSelectedSession,
	confirmDeleteSelectedSession
} = useRecordingDeletion(recordingStore, selectedSession, isActiveSession, isDetailMenuOpen);

// Once the tester manually scrolls mid-run, auto-follow stops for the rest of that run. Reset on the next run's first step.
let autoScrollInterrupted = false;

function interruptAutoScroll(): void {
	autoScrollInterrupted = true;
}

// Keeps the actively-dispatching step visible while a watched playback runs. Only follows the panel's own active session, matching the scoping used for step icon coloring above.
watch(() => recordingStore.currentStepIndex, async currentStepIndex => {
	if (currentStepIndex === null || !isActiveSession.value || !recordingStore.isPlaying) { return; }
	if (currentStepIndex === 0) { autoScrollInterrupted = false; }
	if (autoScrollInterrupted) { return; }
	await nextTick();
	const stepEl = detailContainerEl.value?.querySelector(`[data-step-index="${currentStepIndex}"]`);
	stepEl?.scrollIntoView({ behavior: `smooth`, block: `center` });
});
// A failed run auto-opens straight into this detail view (see setPlaybackStatus); its two loads can
// resolve in either order, so this waits on whichever loads second, or the scroll could be dropped.
async function scrollToFirstFailureIfPending(outcomes: RecorderRunStepsLoadedPayload, detail: EyasRecordingEnvelope | null): Promise<void> {
	if (!outcomes?.finished || !detail || recordingStore.pendingFailureScrollSessionId !== outcomes.sessionId) { return; }
	recordingStore.clearPendingFailureScroll();
	const firstFailingIndex = firstFailingStepIndex(outcomes.outcomes);
	if (firstFailingIndex === undefined) { return; }
	await nextTick();
	detailContainerEl.value?.querySelector(`[data-step-index="${firstFailingIndex}"]`)?.scrollIntoView({ behavior: `smooth`, block: `center` });
}
watch([(): RecorderRunStepsLoadedPayload => recordingStore.runStepOutcomes, selectedSessionDetail], ([outcomes, detail]): void => void scrollToFirstFailureIfPending(outcomes, detail));

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
.recording-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }

/* recording/playing timing mirrors the header's recording indicator (AppHeaderRecordingControls.vue) — scoped styles can't be shared across components */
@keyframes recording-pulse { 0% { opacity: 1; } 50% { opacity: 0.35; } 100% { opacity: 1; } }
.recording-card--recording .recording-card__icon-glyph { animation: recording-pulse 1.5s infinite; }
.recording-card--pinned { position: sticky; top: 0; bottom: 0; z-index: 1; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18); background-color: #ffffff; }
.recording-card :deep(.selectable-card__content) .text-caption { font-size: 0.6875rem !important; }
.recording-card__chevron { color: rgba(0, 0, 0, 0.35); }
.recording-card__action--recording { background-color: #e53935; color: #ffffff; }
.recording-card__action--playing { background-color: rgba(25, 28, 30, 0.08); color: rgba(25, 28, 30, 0.7); }
.recording-card__status { font-weight: 600; }
.recording-card__status--passed { color: #43a047; }
.recording-card__status--failed { color: #e53935; }
.recording-card__status--stopped { color: #757575; }
.recording-card__status--recording { color: #e53935; animation: recording-pulse 1.5s infinite; }
.recording-card__status--playing { color: rgb(var(--v-theme-primary)); animation: recording-pulse 1.5s infinite; }

.recording-panel-title-column { min-width: 0; }
.back-link { display: flex; align-items: center; gap: 0.25rem; background: none; border: none; padding: 0; color: var(--modal-primary, #58A1D6); cursor: pointer; }
/* Panel narrows while dimmed during playback (see EyasModal's fadeDuringPlayback); hide text so it doesn't wrap illegibly. Hover restores width and text together. */
.eyas-modal-panel-content--faded:not(:hover) .recording-panel-text { display: none; }
:deep(.v-timeline-item__body) { overflow-wrap: anywhere; padding-block-end: 0.75rem; }
/* Per-step blink via :deep() since Vuetify's dot-color prop alone can't carry an animation. */
.step-dot--recording-active :deep(.v-timeline-divider__dot), .step-dot--playing-active :deep(.v-timeline-divider__dot) { animation: recording-pulse 1.5s infinite; }
.step-timeline-title { font-size: 0.8125rem; line-height: 1.3; }
.step-timeline-detail { font-size: 0.75rem; line-height: 1.3; margin-top: 0.125rem; }
</style>
