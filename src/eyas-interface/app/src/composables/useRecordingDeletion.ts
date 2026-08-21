import { computed, ref, type ComputedRef, type Ref } from 'vue';
import type useRecordingStore from '@/stores/recording.js';
import type { ChannelName, IsActive, IsVisible } from '@registry/primitives.js';
import type { RecordingSessionSummary, RecorderDeleteSessionPayload } from '@registry/ipc.js';

type RecordingStore = ReturnType<typeof useRecordingStore>;

export type RecordingDeletionApi = {
	isDeleteConfirmOpen: Ref<IsVisible>;
	isSelectedSessionBusy: ComputedRef<IsActive>;
	deleteSelectedSession: () => void;
	confirmDeleteSelectedSession: () => void;
};

export default function useRecordingDeletion(
	recordingStore: RecordingStore,
	selectedSession: Ref<RecordingSessionSummary | null>,
	isActiveSession: ComputedRef<IsActive>,
	isDetailMenuOpen: Ref<IsActive>
): RecordingDeletionApi {
	const isDeleteConfirmOpen = ref<IsVisible>(false);

	// A recording that's actively recording or replaying can't be deleted out from under itself — there'd be nothing left in core to stop it, and the store would keep reading its now-stale status.
	const isSelectedSessionBusy = computed<IsActive>(() => isActiveSession.value && (recordingStore.isRecording || recordingStore.isPlaying));

	function deleteSelectedSession(): void {
		isDetailMenuOpen.value = false;
		if (selectedSession.value && !isSelectedSessionBusy.value) { isDeleteConfirmOpen.value = true; }
	}

	// Re-checked here too: the confirmation dialog is asynchronous (unlike the old blocking window.confirm),
	// so a replay/recording can start on this session while the dialog sits open awaiting a click.
	function confirmDeleteSelectedSession(): void {
		const sessionId = selectedSession.value?.sessionId;
		if (!sessionId || isSelectedSessionBusy.value) { return; }
		window.eyas?.send(`recorder-delete-session` as ChannelName, { sessionId } as RecorderDeleteSessionPayload);
	}

	return { isDeleteConfirmOpen, isSelectedSessionBusy, deleteSelectedSession, confirmDeleteSelectedSession };
}
