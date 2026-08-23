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

	test(`setPlaybackStatus accumulates mismatches across successive playing payloads within one run, rather than resetting on each step`, () => {
		const store = useRecordingStore();
		store.setPlaybackStatus({ status: `playing`, currentStepIndex: 0 });
		store.setPlaybackStatus({ status: `playing`, currentStepIndex: 1, mismatches: [MISMATCH] });

		// a later step's `playing` payload carrying no new mismatches must not wipe an earlier step's finding
		store.setPlaybackStatus({ status: `playing`, currentStepIndex: 2 });

		expect(store.mismatchCount).toBe(1);
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

	const SUMMARY = { sessionId: `s1`, title: `t`, startedAt: 1, stoppedAt: 2, stepCount: 0, lastRunOutcome: null };

	test(`setSessionsList stores the sessions received from the recorder-list-sessions IPC reply`, () => {
		const store = useRecordingStore();
		store.setSessionsList([SUMMARY]);
		expect(store.savedSessions).toEqual([SUMMARY]);
	});

	test(`selectedSession resolves the summary matching the selected sessionId`, () => {
		const store = useRecordingStore();
		store.setSessionsList([SUMMARY]);
		store.selectSession(`s1`);
		expect(store.selectedSession).toEqual(SUMMARY);
	});

	test(`selectedSession is null when nothing is selected`, () => {
		const store = useRecordingStore();
		store.setSessionsList([SUMMARY]);
		expect(store.selectedSession).toBeNull();
	});

	test(`selectSession clears any previously loaded detail so the old session's steps don't flash before the new ones load`, () => {
		const store = useRecordingStore();
		store.setSelectedSessionDetail({ sessionId: `s1`, recording: { title: `t`, steps: [] } } as never);
		store.selectSession(`s1`);
		expect(store.selectedSessionDetail).toBeNull();
	});

	test(`setSelectedSessionDetail ignores a reply for a session that is no longer selected`, () => {
		const store = useRecordingStore();
		store.selectSession(`s1`);
		store.setSelectedSessionDetail({ sessionId: `stale-id`, recording: { title: `t`, steps: [] } } as never);
		expect(store.selectedSessionDetail).toBeNull();
	});

	test(`backToBrowser clears the selected session and its loaded detail`, () => {
		const store = useRecordingStore();
		store.setSessionsList([SUMMARY]);
		store.selectSession(`s1`);
		store.setSelectedSessionDetail({ sessionId: `s1`, recording: { title: `t`, steps: [] } } as never);

		store.backToBrowser();

		expect(store.selectedSession).toBeNull();
		expect(store.selectedSessionDetail).toBeNull();
	});

	test(`togglePanel clears the selected session when the panel closes`, () => {
		const store = useRecordingStore();
		store.setSessionsList([SUMMARY]);
		store.selectSession(`s1`);
		store.isPanelOpen = true;

		store.togglePanel();

		expect(store.isPanelOpen).toBe(false);
		expect(store.selectedSession).toBeNull();
	});

	test(`togglePanel drills into the actively-playing session's detail view when opened mid-run`, () => {
		const store = useRecordingStore();
		store.setSessionsList([SUMMARY]);
		store.sessionId = `s1` as never;
		store.setPlaybackStatus({ status: `playing`, completedSteps: 0, totalSteps: 2 } as never);

		store.togglePanel();

		expect(store.isPanelOpen).toBe(true);
		expect(store.selectedSessionId).toBe(`s1`);
	});

	test(`togglePanel opens to the browser list when nothing is playing`, () => {
		const store = useRecordingStore();
		store.setSessionsList([SUMMARY]);
		store.sessionId = `s1` as never;

		store.togglePanel();

		expect(store.isPanelOpen).toBe(true);
		expect(store.selectedSessionId).toBeNull();
	});

	test(`setPlaybackStatus opens the panel and selects the session when a replay fails with a thrown error while the panel is closed`, () => {
		const store = useRecordingStore();
		store.setSessionsList([SUMMARY]);
		store.sessionId = `s1` as never;

		store.setPlaybackStatus({ status: `failed`, error: `boom` });

		expect(store.isPanelOpen).toBe(true);
		expect(store.selectedSessionId).toBe(`s1`);
		expect(store.pendingFailureScrollSessionId).toBe(`s1`);
	});

	test(`setPlaybackStatus opens the panel and selects the session when a replay stops with mismatches while the panel is closed`, () => {
		const store = useRecordingStore();
		store.setSessionsList([SUMMARY]);
		store.sessionId = `s1` as never;

		store.setPlaybackStatus({ status: `stopped`, mismatches: [MISMATCH] });

		expect(store.isPanelOpen).toBe(true);
		expect(store.selectedSessionId).toBe(`s1`);
		expect(store.pendingFailureScrollSessionId).toBe(`s1`);
	});

	test(`setPlaybackStatus does not touch the panel when a replay finishes cleanly`, () => {
		const store = useRecordingStore();
		store.setSessionsList([SUMMARY]);
		store.sessionId = `s1` as never;

		store.setPlaybackStatus({ status: `stopped` });

		expect(store.isPanelOpen).toBe(false);
		expect(store.selectedSessionId).toBeNull();
		expect(store.pendingFailureScrollSessionId).toBeNull();
	});

	test(`setPlaybackStatus does not reopen or reselect when the panel is already open`, () => {
		const store = useRecordingStore();
		store.setSessionsList([SUMMARY]);
		store.sessionId = `s1` as never;
		store.isPanelOpen = true;

		store.setPlaybackStatus({ status: `failed`, error: `boom` });

		expect(store.selectedSessionId).toBeNull();
		expect(store.pendingFailureScrollSessionId).toBeNull();
	});

	test(`clearPendingFailureScroll clears the one-shot marker`, () => {
		const store = useRecordingStore();
		store.setSessionsList([SUMMARY]);
		store.sessionId = `s1` as never;
		store.setPlaybackStatus({ status: `failed`, error: `boom` });

		store.clearPendingFailureScroll();

		expect(store.pendingFailureScrollSessionId).toBeNull();
	});

	describe(`removeDeletedSession clearing the active run context`, () => {
		describe(`Given the deleted session is the currently active one (idle/stopped)`, () => {
			function setUpActiveRunContext(): ReturnType<typeof useRecordingStore> {
				const store = useRecordingStore();
				store.setFromIpc({ isRecording: false, sessionId: `s1` });
				store.setPlaybackStatus({ status: `failed`, error: `boom`, mismatches: [MISMATCH], schemaWarning: `Made by a newer version.`, currentStepIndex: 2, completedSteps: 3, totalSteps: 5 });
				return store;
			}

			test(`Then it clears sessionId back to null`, () => {
				const store = setUpActiveRunContext();
				store.removeDeletedSession({ sessionId: `s1` });
				expect(store.sessionId).toBeNull();
			});

			test(`Then it clears playbackStatus back to null`, () => {
				const store = setUpActiveRunContext();
				store.removeDeletedSession({ sessionId: `s1` });
				expect(store.playbackStatus).toBeNull();
			});

			test(`Then it clears playbackError back to null`, () => {
				const store = setUpActiveRunContext();
				store.removeDeletedSession({ sessionId: `s1` });
				expect(store.playbackError).toBeNull();
			});

			test(`Then it clears playbackMismatches back to an empty array`, () => {
				const store = setUpActiveRunContext();
				store.removeDeletedSession({ sessionId: `s1` });
				expect(store.playbackMismatches).toEqual([]);
			});

			test(`Then it clears playbackSchemaWarning back to null`, () => {
				const store = setUpActiveRunContext();
				store.removeDeletedSession({ sessionId: `s1` });
				expect(store.playbackSchemaWarning).toBeNull();
			});

			test(`Then it clears currentStepIndex back to null`, () => {
				const store = setUpActiveRunContext();
				store.removeDeletedSession({ sessionId: `s1` });
				expect(store.currentStepIndex).toBeNull();
			});

			test(`Then it resets completedSteps and totalSteps back to 0`, () => {
				const store = setUpActiveRunContext();
				store.removeDeletedSession({ sessionId: `s1` });
				expect(store.completedSteps).toBe(0);
				expect(store.totalSteps).toBe(0);
			});

			test(`Then it leaves status as 'stopped', not null`, () => {
				const store = setUpActiveRunContext();
				store.removeDeletedSession({ sessionId: `s1` });
				expect(store.status).toBe(`stopped`);
			});
		});

		describe(`Given the deleted session is the currently active one and a playback is still in progress`, () => {
			test(`Then it still clears sessionId and every playback-status field, with no special-casing for isPlaying`, () => {
				const store = useRecordingStore();
				store.setFromIpc({ isRecording: false, sessionId: `s1` });
				store.setPlaybackStatus({ status: `playing`, completedSteps: 2, totalSteps: 5, currentStepIndex: 1 });
				expect(store.isPlaying).toBe(true);

				store.removeDeletedSession({ sessionId: `s1` });

				expect(store.sessionId).toBeNull();
				expect(store.playbackStatus).toBeNull();
				expect(store.currentStepIndex).toBeNull();
				expect(store.completedSteps).toBe(0);
				expect(store.totalSteps).toBe(0);
			});
		});

		describe(`Given the deleted session is not the currently active one (sad path)`, () => {
			function setUpActiveRunContext(): ReturnType<typeof useRecordingStore> {
				const store = useRecordingStore();
				store.setFromIpc({ isRecording: false, sessionId: `s1` });
				store.setPlaybackStatus({ status: `playing`, schemaWarning: `Made by a newer version.`, currentStepIndex: 2, completedSteps: 3, totalSteps: 5, mismatches: [MISMATCH] });
				return store;
			}

			test(`Then it leaves sessionId untouched`, () => {
				const store = setUpActiveRunContext();
				store.removeDeletedSession({ sessionId: `other-session` });
				expect(store.sessionId).toBe(`s1`);
			});

			test(`Then it leaves playbackStatus, playbackError, playbackMismatches, playbackSchemaWarning, currentStepIndex, completedSteps, and totalSteps untouched`, () => {
				const store = setUpActiveRunContext();
				store.removeDeletedSession({ sessionId: `other-session` });
				expect(store.playbackStatus).toBe(`playing`);
				expect(store.playbackError).toBeNull();
				expect(store.playbackMismatches).toEqual([MISMATCH]);
				expect(store.playbackSchemaWarning).toBe(`Made by a newer version.`);
				expect(store.currentStepIndex).toBe(2);
				expect(store.completedSteps).toBe(3);
				expect(store.totalSteps).toBe(5);
			});

			test(`Then it still removes the deleted session from savedSessions, as before`, () => {
				const store = setUpActiveRunContext();
				store.setSessionsList([SUMMARY, { ...SUMMARY, sessionId: `other-session` }]);

				store.removeDeletedSession({ sessionId: `other-session` });

				expect(store.savedSessions).toEqual([SUMMARY]);
			});

			test(`Then it still resets selectedSessionId/selectedSessionDetail/runStepOutcomes when the deleted session was the selected one, as before`, () => {
				const store = setUpActiveRunContext();
				store.setSessionsList([{ ...SUMMARY, sessionId: `other-session` }]);
				store.selectSession(`other-session` as never);
				store.setSelectedSessionDetail({ sessionId: `other-session`, recording: { title: `t`, steps: [] } } as never);

				store.removeDeletedSession({ sessionId: `other-session` });

				expect(store.selectedSessionId).toBeNull();
				expect(store.selectedSessionDetail).toBeNull();
			});
		});
	});

	describe(`Recovering the active session after it was cleared`, () => {
		describe(`Given the active session's context was cleared by a delete`, () => {
			describe(`When a new recording starts`, () => {
				test(`Then setFromIpc establishes a fresh, non-null sessionId`, () => {
					const store = useRecordingStore();
					store.setFromIpc({ isRecording: false, sessionId: `s1` });
					store.removeDeletedSession({ sessionId: `s1` });
					expect(store.sessionId).toBeNull();

					store.setFromIpc({ isRecording: true, sessionId: `s2` });

					expect(store.sessionId).toBe(`s2`);
				});
			});
		});
	});
});
