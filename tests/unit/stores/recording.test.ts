import { describe, test, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import useRecordingStore from '@/stores/recording.js';

describe(`useRecordingStore`, () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	test(`initialises with no status, sessionId, or playback error`, () => {
		const store = useRecordingStore();
		expect(store.status).toBeNull();
		expect(store.sessionId).toBeNull();
		expect(store.playbackError).toBeNull();
	});

	test(`setFromIpc sets status to 'recording' and stores the sessionId`, () => {
		const store = useRecordingStore();
		store.setFromIpc({ isRecording: true, sessionId: `sess-1` });
		expect(store.status).toBe(`recording`);
		expect(store.sessionId).toBe(`sess-1`);
		expect(store.isRecording).toBe(true);
	});

	test(`setFromIpc sets status to 'stopped' when isRecording is false`, () => {
		const store = useRecordingStore();
		store.setFromIpc({ isRecording: false, sessionId: `sess-1` });
		expect(store.status).toBe(`stopped`);
		expect(store.isStopped).toBe(true);
	});

	test(`setFromIpc clears stale playback status, error, and progress when a new recording starts`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `failed`, error: `boom` });
		store.setPlaybackStatus({ status: `playing`, completedSteps: 2, totalSteps: 5 });

		store.setFromIpc({ isRecording: true, sessionId: `sess-2` });

		expect(store.playbackStatus).toBeNull();
		expect(store.playbackError).toBeNull();
		expect(store.completedSteps).toBe(0);
		expect(store.totalSteps).toBe(0);
	});

	test(`setPlaybackStatus clears any prior playback error when a new playback starts`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `failed`, error: `boom` });
		store.setPlaybackStatus({ status: `playing` });
		expect(store.playbackError).toBeNull();
	});

	test(`setPlaybackStatus records the error message when playback fails`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `failed`, error: `network offline` });
		expect(store.playbackError).toBe(`network offline`);
	});

	test(`setPlaybackStatus clears the error when playback stops successfully`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `failed`, error: `boom` });
		store.setPlaybackStatus({ status: `stopped` });
		expect(store.playbackError).toBeNull();
	});

	// Replay reports recorded expectations that didn't hold rather than silently correcting the page
	// (see session-playback.assertions.ts) — these are what make that visible to the tester.
	const MISMATCH = { selector: `testid/editor`, expected: `Rich text`, actual: `Rch txt`, stepIndex: 0 };

	test(`setPlaybackStatus stores mismatches reported on a completed run`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `stopped`, mismatches: [MISMATCH] });
		expect(store.mismatchCount).toBe(1);
	});

	test(`a run that finished cleanly reports no mismatches`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `stopped` });
		expect(store.mismatchCount).toBe(0);
	});

	test(`setPlaybackStatus clears a previous run's mismatches when a new playback starts`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `stopped`, mismatches: [MISMATCH] });

		store.setPlaybackStatus({ status: `playing` });

		// otherwise last run's findings sit next to a fresh progress ring and read as this run's
		expect(store.mismatchCount).toBe(0);
	});

	test(`mismatchSummary describes what was expected against what was found`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `stopped`, mismatches: [MISMATCH] });
		expect(store.mismatchSummary).toBe(`testid/editor: expected "Rich text", found "Rch txt"`);
	});

	test(`mismatchSummary distinguishes an element that never resolved from wrong text`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `stopped`, mismatches: [{ ...MISMATCH, actual: null }] });
		expect(store.mismatchSummary).toContain(`not found on the page`);
	});

	test(`mismatchSummary caps its detail so a broadly-broken run can't overflow the tooltip`, () => {
		const store = useRecordingStore();
		const many = Array.from({ length: 8 }, (_unused, i) => ({ ...MISMATCH, stepIndex: i }));

		store.setPlaybackStatus({ status: `stopped`, mismatches: many });

		expect(store.mismatchSummary.split(`\n`)).toHaveLength(6);
		expect(store.mismatchSummary).toContain(`...and 3 more`);
	});

	test(`setPlaybackStatus stores the schema warning sent when a replay starts`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `playing`, schemaWarning: `Made by a newer version.` });
		expect(store.playbackSchemaWarning).toBe(`Made by a newer version.`);
	});

	test(`the schema warning outlives the run it describes, since only its end is worth reading`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `playing`, schemaWarning: `Made by a newer version.` });

		// only the `playing` payload carries the field — if `stopped` were allowed to fall back to null
		// it would clear the warning at exactly the moment the tester turns to read the results, which
		// is the one moment "the replay may be incomplete" actually matters
		store.setPlaybackStatus({ status: `stopped`, mismatches: [MISMATCH] });

		expect(store.playbackSchemaWarning).toBe(`Made by a newer version.`);
	});

	test(`a new replay of a readable session clears the previous run's schema warning`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `playing`, schemaWarning: `Made by a newer version.` });

		store.setPlaybackStatus({ status: `playing` });

		expect(store.playbackSchemaWarning).toBeNull();
	});

	test(`an ordinary replay reports no schema warning`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `playing` });
		expect(store.playbackSchemaWarning).toBeNull();
	});
});
