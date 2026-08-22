import type useRecordingStore from '@/stores/recording.js';
import type { RecordingCardStatus } from '@/utils/recording-card.utils.js';
import type { ChannelName, IsActive } from '@registry/primitives.js';
import type { RecordingSessionSummary } from '@registry/ipc.js';

type RecordingStore = ReturnType<typeof useRecordingStore>;

export type RecordingRowStatusApi = {
	dotClassFor: (session: RecordingSessionSummary) => RecordingCardStatus;
	isPinned: (session: RecordingSessionSummary) => IsActive;
	isRowActionDisabled: (session: RecordingSessionSummary) => IsActive;
	onActionClick: (session: RecordingSessionSummary) => void;
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

	// Only one recording/playback instance can run app-wide, so a play button on any other busy row would be ignored or fight the active run.
	function isRowActionDisabled(session: RecordingSessionSummary): IsActive {
		if (isPinned(session)) { return false; }
		return (recordingStore.isRecording || recordingStore.isPlaying) && recordingStore.sessionId !== session.sessionId;
	}

	function onActionClick(session: RecordingSessionSummary): void {
		const status = dotClassFor(session);
		if (status === `recording`) { window.eyas?.send(`recorder-stop` as ChannelName); return; }
		if (status === `playing`) { window.eyas?.send(`recorder-replay-stop` as ChannelName); return; }
		window.eyas?.send(`recorder-replay-request` as ChannelName, { sessionId: session.sessionId });
	}

	return { dotClassFor, isPinned, isRowActionDisabled, onActionClick };
}
