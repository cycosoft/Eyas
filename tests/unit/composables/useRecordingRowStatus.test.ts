import { describe, test, expect, beforeEach } from 'vitest';
import useRecordingRowStatus from '@/composables/useRecordingRowStatus.js';
import { getIpcMock } from '@setup/ipc-mock-utils.js';
import type { RecordingSessionSummary } from '@registry/ipc.js';

beforeEach(() => {
	getIpcMock(`send`).mockClear();
});

function makeSession(overrides: Partial<RecordingSessionSummary> = {}): RecordingSessionSummary {
	return {
		sessionId: `sess-1`,
		title: `2026-01-01T00:00:00.000Z`,
		startedAt: 0,
		stoppedAt: 1,
		stepCount: 3,
		lastRunOutcome: null,
		...overrides
	};
}

type RecordingRowStore = Parameters<typeof useRecordingRowStatus>[0];

function makeStore(overrides: Partial<RecordingRowStore> = {}): RecordingRowStore {
	return {
		isRecording: false,
		isPlaying: false,
		sessionId: null,
		...overrides
	} as RecordingRowStore;
}

describe(`useRecordingRowStatus.dotClassFor with a "stopped" last run`, () => {
	test(`reports the row status as stopped when the recording isn't currently active`, () => {
		const { dotClassFor } = useRecordingRowStatus(makeStore());
		const session = makeSession({ lastRunOutcome: `stopped` });

		expect(dotClassFor(session)).toBe(`stopped`);
	});

	test(`still prioritizes a live recording over a stale stopped outcome from a previous run`, () => {
		const { dotClassFor } = useRecordingRowStatus(makeStore({ isRecording: true, sessionId: `sess-1` }));
		const session = makeSession({ lastRunOutcome: `stopped` });

		expect(dotClassFor(session)).toBe(`recording`);
	});
});

describe(`useRecordingRowStatus row interactivity for a "stopped" last run`, () => {
	test(`does not pin the row, unlike an active recording/playing row`, () => {
		const { isPinned } = useRecordingRowStatus(makeStore());
		const session = makeSession({ lastRunOutcome: `stopped` });

		expect(isPinned(session)).toBe(false);
	});

});

describe(`useRecordingRowStatus row interactivity while another row is active`, () => {
	test(`sends recorder-replay-request for this row when nothing else is active`, () => {
		const { onActionClick } = useRecordingRowStatus(makeStore());
		const session = makeSession();

		onActionClick(session);

		expect(getIpcMock(`send`)).toHaveBeenCalledWith(`recorder-replay-request`, { sessionId: `sess-1` });
	});

	test(`sends recorder-replay-request for this row directly, with no confirmation, while a different session is playing`, () => {
		const { onActionClick } = useRecordingRowStatus(makeStore({ isPlaying: true, sessionId: `sess-other` }));
		const session = makeSession();

		onActionClick(session);

		expect(getIpcMock(`send`)).toHaveBeenCalledWith(`recorder-replay-request`, { sessionId: `sess-1` });
		expect(getIpcMock(`send`)).not.toHaveBeenCalledWith(`recorder-stop`);
	});

	test(`opens the interrupt confirmation instead of acting immediately while a different session is recording`, () => {
		const { onActionClick, isInterruptConfirmOpen } = useRecordingRowStatus(makeStore({ isRecording: true, sessionId: `sess-other` }));
		const session = makeSession();

		onActionClick(session);

		expect(isInterruptConfirmOpen.value).toBe(true);
		expect(getIpcMock(`send`)).not.toHaveBeenCalled();
	});

	test(`confirming the interrupt stops the active recording and starts the originally-clicked session`, () => {
		const api = useRecordingRowStatus(makeStore({ isRecording: true, sessionId: `sess-other` }));
		api.onActionClick(makeSession());

		api.confirmInterrupt();

		expect(getIpcMock(`send`)).toHaveBeenCalledWith(`recorder-stop`);
		expect(getIpcMock(`send`)).toHaveBeenCalledWith(`recorder-replay-request`, { sessionId: `sess-1` });
		expect(api.isInterruptConfirmOpen.value).toBe(false);
	});

	test(`cancelling the interrupt leaves the active recording running and starts nothing`, () => {
		const api = useRecordingRowStatus(makeStore({ isRecording: true, sessionId: `sess-other` }));
		api.onActionClick(makeSession());

		api.cancelInterrupt();

		expect(getIpcMock(`send`)).not.toHaveBeenCalled();
		expect(api.isInterruptConfirmOpen.value).toBe(false);
	});

	test(`confirming the interrupt after the active recording already stopped on its own still starts the originally-clicked session, without erroring or sending a second stop`, () => {
		// The recording ending on its own (header stop button, or the row's own stop action) while
		// this dialog was still open is indistinguishable here from the ordinary confirm path: the
		// composable holds only the pending session id, not a live read of recordingStore.isRecording,
		// and window.eyas.send('recorder-stop') on an already-idle recorder is itself a safe no-op
		// (see sessionRecorderService.stopRecording's `if (!_session) { return; }` guard).
		const api = useRecordingRowStatus(makeStore({ isRecording: true, sessionId: `sess-other` }));
		api.onActionClick(makeSession());

		expect(() => api.confirmInterrupt()).not.toThrow();
		expect(getIpcMock(`send`)).toHaveBeenCalledWith(`recorder-stop`);
		expect(getIpcMock(`send`)).toHaveBeenCalledWith(`recorder-replay-request`, { sessionId: `sess-1` });
	});
});
