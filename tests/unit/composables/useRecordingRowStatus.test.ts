import { describe, test, expect } from 'vitest';
import useRecordingRowStatus from '@/composables/useRecordingRowStatus.js';
import type { RecordingSessionSummary } from '@registry/ipc.js';

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

	test(`does not disable the row's action while nothing else is running`, () => {
		const { isRowActionDisabled } = useRecordingRowStatus(makeStore());
		const session = makeSession({ lastRunOutcome: `stopped` });

		expect(isRowActionDisabled(session)).toBe(false);
	});
});
