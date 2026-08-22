import { ref } from 'vue';
import type useRecordingStore from '@/stores/recording.js';
import type { RecordingCardStatus } from '@/utils/recording-card.utils.js';
import type { ChannelName, IsActive, SessionId } from '@registry/primitives.js';
import type { RecordingSessionSummary } from '@registry/ipc.js';

type RecordingStore = ReturnType<typeof useRecordingStore>;

export type RecordingRowStatusApi = {
	dotClassFor: (session: RecordingSessionSummary) => RecordingCardStatus;
	isPinned: (session: RecordingSessionSummary) => IsActive;
	onActionClick: (session: RecordingSessionSummary) => void;
	isInterruptConfirmOpen: ReturnType<typeof ref<IsActive>>;
	confirmInterrupt: () => void;
	cancelInterrupt: () => void;
};

export default function useRecordingRowStatus(recordingStore: RecordingStore): RecordingRowStatusApi {
	// Live blink takes priority over last-run status, and is local-instance only (recording/playback state is never shared across Eyas processes).
	function dotClassFor(session: RecordingSessionSummary): RecordingCardStatus {
		if (recordingStore.isRecording && recordingStore.sessionId === session.sessionId) { return `recording`; }
		if (recordingStore.isPlaying && recordingStore.sessionId === session.sessionId) { return `playing`; }
		if (session.lastRunOutcome === `passed`) { return `passed`; }
		if (session.lastRunOutcome === `failed`) { return `failed`; }
		if (session.lastRunOutcome === `stopped`) { return `stopped`; }
		return `neutral`;
	}

	// Keeps the actively recording/playing row in view regardless of where it sits in the sorted list.
	function isPinned(session: RecordingSessionSummary): IsActive {
		const status = dotClassFor(session);
		return status === `recording` || status === `playing`;
	}

	const isInterruptConfirmOpen = ref<IsActive>(false);
	let pendingSessionId: SessionId | null = null;

	function startPlayback(sessionId: SessionId): void {
		window.eyas?.send(`recorder-replay-request` as ChannelName, { sessionId });
	}

	// Only a currently-recording row needs a confirmation — replacing an in-progress playback with
	// another is safe to do outright, since playSession() (core) tears the old run down cleanly and
	// marks it `stopped` before dispatching the new one's steps.
	function onActionClick(session: RecordingSessionSummary): void {
		const status = dotClassFor(session);
		if (status === `recording`) { window.eyas?.send(`recorder-stop` as ChannelName); return; }
		if (status === `playing`) { window.eyas?.send(`recorder-replay-stop` as ChannelName); return; }

		if (recordingStore.isRecording) {
			pendingSessionId = session.sessionId;
			isInterruptConfirmOpen.value = true;
			return;
		}
		startPlayback(session.sessionId);
	}

	// A no-op recorder-stop (nothing recording) is safe — sessionRecorderService.stopRecording()
	// itself no-ops when there's no active session, so a recording that already ended on its own
	// (e.g. the header stop button) while this dialog sat open doesn't need special-casing here.
	function confirmInterrupt(): void {
		isInterruptConfirmOpen.value = false;
		if (!pendingSessionId) { return; }
		window.eyas?.send(`recorder-stop` as ChannelName);
		startPlayback(pendingSessionId);
		pendingSessionId = null;
	}

	function cancelInterrupt(): void {
		isInterruptConfirmOpen.value = false;
		pendingSessionId = null;
	}

	return { dotClassFor, isPinned, onActionClick, isInterruptConfirmOpen, confirmInterrupt, cancelInterrupt };
}
