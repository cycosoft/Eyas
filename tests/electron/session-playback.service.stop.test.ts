import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CoreContext } from '@registry/eyas-core.js';
import type { EyasRecordingEnvelope } from '@registry/recording.js';
import type { DomainUrl } from '@registry/primitives.js';

vi.mock(`electron`, () => ({}));

const sendCommand = vi.fn().mockResolvedValue(undefined);
const attach = vi.fn();
const detach = vi.fn();
const isAttached = vi.fn().mockReturnValue(false);
const loadURL = vi.fn().mockResolvedValue(undefined);
const executeJavaScript = vi.fn().mockResolvedValue(undefined);
const send = vi.fn();
const once = vi.fn();
const removeListener = vi.fn();
const isLoading = vi.fn().mockReturnValue(false);

vi.mock(`@core/session-recorder.service.js`, () => ({
	default: { getSession: vi.fn(), setReplaying: vi.fn(), isUnknownSchema: vi.fn().mockReturnValue(false) }
}));

vi.mock(`@core/run-history.service.js`, () => ({
	default: {
		startRun: vi.fn().mockResolvedValue(`run-1`),
		recordStepStart: vi.fn().mockResolvedValue(undefined),
		recordStepFailure: vi.fn().mockResolvedValue(undefined),
		finishRun: vi.fn().mockResolvedValue(undefined),
		markStopped: vi.fn().mockResolvedValue(undefined)
	}
}));

vi.mock(`@core/settings-service.js`, () => ({
	default: { get: vi.fn().mockReturnValue(`no-delay`) }
}));

const { getPopupWebContents, closePopup, closeAllPopups, setReplayPopupIdQueue, clearReplayPopupIdQueue, hideAllRecordingOverlays, showAllRecordingOverlays } = vi.hoisted(() => ({
	getPopupWebContents: vi.fn(),
	closePopup: vi.fn().mockResolvedValue(undefined),
	closeAllPopups: vi.fn().mockResolvedValue(undefined),
	setReplayPopupIdQueue: vi.fn(),
	clearReplayPopupIdQueue: vi.fn(),
	hideAllRecordingOverlays: vi.fn(),
	showAllRecordingOverlays: vi.fn()
}));

vi.mock(`@core/window.popups.js`, () => ({
	getPopupWebContents,
	closePopup,
	closeAllPopups,
	setReplayPopupIdQueue,
	clearReplayPopupIdQueue,
	hideAllRecordingOverlays,
	showAllRecordingOverlays
}));

import sessionRecorderService from '@core/session-recorder.service.js';
import runHistoryService from '@core/run-history.service.js';
import settingsService from '@core/settings-service.js';
import playbackService from '@core/session-playback.service.js';

const getURL = vi.fn().mockReturnValue(`https://example.com/`);

function makeSession(steps: EyasRecordingEnvelope[`recording`][`steps`], startUrl: DomainUrl | null = null): EyasRecordingEnvelope {
	return {
		eyasSchemaVersion: `1.0.0`,
		projectId: `test-proj`,
		sessionId: `sess-1`,
		title: `2026-01-01T00:00:00.000Z`,
		startedAt: 0,
		stoppedAt: 1,
		startUrl,
		viewport: { width: 1024, height: 768 },
		components: {},
		recording: { title: `2026-01-01T00:00:00.000Z`, steps }
	};
}

function makeCtx(): CoreContext {
	return {
		$eyasLayer: { webContents: { send } },
		toggleEyasUI: vi.fn(),
		$testLayer: {
			webContents: {
				debugger: { attach, detach, isAttached, sendCommand },
				loadURL,
				executeJavaScript,
				getURL,
				once,
				removeListener,
				isLoading
			}
		}
	} as unknown as CoreContext;
}

beforeEach(() => {
	vi.mocked(sessionRecorderService.getSession).mockReset();
	vi.mocked(sessionRecorderService.setReplaying).mockClear();
	vi.mocked(settingsService.get).mockReset().mockReturnValue(`no-delay`);
	sendCommand.mockClear();
	attach.mockClear();
	detach.mockClear();
	loadURL.mockReset().mockResolvedValue(undefined);
	executeJavaScript.mockClear().mockResolvedValue(undefined);
	isLoading.mockClear().mockReturnValue(false);
	send.mockClear();
	getURL.mockClear().mockReturnValue(`https://example.com/`);
	getPopupWebContents.mockReset().mockReturnValue(null);
	closePopup.mockClear().mockResolvedValue(undefined);
	closeAllPopups.mockClear().mockResolvedValue(undefined);
	setReplayPopupIdQueue.mockClear();
	clearReplayPopupIdQueue.mockClear();
	vi.mocked(runHistoryService.startRun).mockClear();
	vi.mocked(runHistoryService.recordStepStart).mockClear();
	vi.mocked(runHistoryService.finishRun).mockClear();
	vi.mocked(runHistoryService.markStopped).mockClear();
});

describe(`sessionPlaybackService.stopPlayback`, () => {
	test(`aborts an in-progress replay before its remaining steps are dispatched, and still sends a final 'stopped' status`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `navigate`, url: `https://example.com/a`, timestamp: 1 },
			{ type: `navigate`, url: `https://example.com/b`, timestamp: 2 },
			{ type: `navigate`, url: `https://example.com/c`, timestamp: 3 }
		]));
		loadURL.mockImplementationOnce(async () => { playbackService.stopPlayback(); });
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(loadURL).toHaveBeenCalledTimes(1);
		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, { status: `stopped`, sessionId: `sess-1` });
		// a user-initiated stop is marked explicitly, so the dot reads it as `stopped` rather than
		// collapsing to the `failed` state a crash would leave
		expect(runHistoryService.finishRun).not.toHaveBeenCalled();
		expect(runHistoryService.markStopped).toHaveBeenCalledWith(`test-proj`, `run-1`);
	});

	test(`still runs the same cleanup as a normal completion (debugger detach, popup queue cleared, replaying flag cleared)`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `navigate`, url: `https://example.com/a`, timestamp: 1 },
			{ type: `navigate`, url: `https://example.com/b`, timestamp: 2 }
		]));
		loadURL.mockImplementationOnce(async () => { playbackService.stopPlayback(); });
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(detach).toHaveBeenCalled();
		expect(clearReplayPopupIdQueue).toHaveBeenCalled();
		const calls = vi.mocked(sessionRecorderService.setReplaying).mock.calls.map(c => c[0]);
		expect(calls).toEqual([true, false]);
	});

	test(`calling stopPlayback with no replay in progress is a no-op that doesn't affect the next replay`, async () => {
		playbackService.stopPlayback();
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `navigate`, url: `https://example.com/a`, timestamp: 1 },
			{ type: `navigate`, url: `https://example.com/b`, timestamp: 2 }
		]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(loadURL).toHaveBeenCalledTimes(2);
	});

	test(`a replay that completes normally after a previous replay was stopped is not pre-aborted by stale state`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValueOnce(makeSession([
			{ type: `navigate`, url: `https://example.com/a`, timestamp: 1 },
			{ type: `navigate`, url: `https://example.com/b`, timestamp: 2 }
		]));
		loadURL.mockImplementationOnce(async () => { playbackService.stopPlayback(); });
		const ctx = makeCtx();
		await playbackService.playSession(ctx, `sess-1`);
		expect(loadURL).toHaveBeenCalledTimes(1);

		loadURL.mockClear();
		vi.mocked(sessionRecorderService.getSession).mockResolvedValueOnce(makeSession([
			{ type: `navigate`, url: `https://example.com/a`, timestamp: 1 },
			{ type: `navigate`, url: `https://example.com/b`, timestamp: 2 }
		]));

		await playbackService.playSession(ctx, `sess-1`);

		expect(loadURL).toHaveBeenCalledTimes(2);
	});

	test(`still reports 'stopped' (not 'failed') when stopPlayback() races an in-flight step that goes on to throw`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `keyDown`, key: `a`, timestamp: 1 },
			{ type: `keyDown`, key: `b`, timestamp: 2 }
		]));
		// simulates the user pressing stop while this step's CDP command is in flight, and that
		// in-flight command then rejecting (e.g. a torn-down popup) rather than the loop simply
		// noticing the abort flag on its next iteration
		sendCommand.mockImplementationOnce(async () => {
			playbackService.stopPlayback();
			throw new Error(`boom`);
		});
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, expect.objectContaining({ status: `stopped` }));
		expect(send).not.toHaveBeenCalledWith(`recorder-playback-status`, expect.objectContaining({ status: `failed` }));
		expect(runHistoryService.markStopped).toHaveBeenCalledWith(`test-proj`, `run-1`);
		expect(runHistoryService.finishRun).not.toHaveBeenCalled();
	});

	test(`tears down any tracked popups before reporting 'stopped' when the replay is aborted mid-way, same as a thrown-step failure`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `navigate`, url: `https://example.com/a`, timestamp: 1 },
			{ type: `navigate`, url: `https://example.com/b`, timestamp: 2 }
		]));
		loadURL.mockImplementationOnce(async () => { playbackService.stopPlayback(); });
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(closeAllPopups).toHaveBeenCalled();
	});
});

describe(`playSession concurrency guard`, () => {
	test(`starting playback of a second session stops the first session's run before the second session's steps dispatch, and persists the first run as 'stopped'`, async () => {
		// sessionA has two steps so the abort can land *between* them: step 0 actually dispatches
		// (proving A was really mid-run, not just queued), step 1 never does (proving the abort check
		// at the top of the loop — not a full pass through the steps — is what stops it).
		const sessionA = makeSession([
			{ type: `navigate`, url: `https://example.com/a1`, timestamp: 1 },
			{ type: `navigate`, url: `https://example.com/a2`, timestamp: 2 }
		]);
		const sessionB = makeSession([
			{ type: `navigate`, url: `https://example.com/b`, timestamp: 1 }
		]);
		sessionB.sessionId = `sess-2`;
		vi.mocked(sessionRecorderService.getSession).mockImplementation(async (_ctx, sessionId) => (
			sessionId === `sess-1` ? sessionA : sessionB
		));
		vi.mocked(runHistoryService.startRun).mockResolvedValueOnce(`run-1`).mockResolvedValueOnce(`run-2`);

		const ctx = makeCtx();
		let resolveLoadUrl!: () => void;
		loadURL.mockImplementationOnce(() => new Promise<void>(resolve => { resolveLoadUrl = resolve; }));

		const playPromiseA = playbackService.playSession(ctx, `sess-1`);
		await vi.waitFor(() => expect(loadURL).toHaveBeenCalledTimes(1));

		// A is now paused mid-dispatch of its first step — this is where a second caller (another
		// row's play button) would interrupt it.
		const playPromiseB = playbackService.playSession(ctx, `sess-2`);
		resolveLoadUrl();
		await Promise.all([playPromiseA, playPromiseB]);

		// only step 0's navigation was ever dispatched (plus B's own step 3) — A's step 1 never
		// dispatched, because the abort was already flagged by the time the loop re-checked it
		expect(loadURL).toHaveBeenCalledTimes(2);
		expect(loadURL).not.toHaveBeenCalledWith(`https://example.com/a2`);
		expect(runHistoryService.markStopped).toHaveBeenCalledWith(`test-proj`, `run-1`);
		expect(runHistoryService.finishRun).toHaveBeenCalledWith(`test-proj`, `run-2`);
		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, expect.objectContaining({ status: `stopped`, sessionId: `sess-1` }));

		// B's own steps didn't start loading until *after* A's run was persisted as stopped
		const markStoppedOrder = vi.mocked(runHistoryService.markStopped).mock.invocationCallOrder[0];
		const sessionBLoadCallIndex = vi.mocked(sessionRecorderService.getSession).mock.calls.findIndex(call => call[1] === `sess-2`);
		const sessionBLoadOrder = vi.mocked(sessionRecorderService.getSession).mock.invocationCallOrder[sessionBLoadCallIndex];
		expect(sessionBLoadOrder).toBeGreaterThan(markStoppedOrder);
	});

	test(`calling playSession again for the session that's already playing does not throw`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `navigate`, url: `https://example.com/a`, timestamp: 1 },
			{ type: `navigate`, url: `https://example.com/b`, timestamp: 2 }
		], `https://example.com/other` as DomainUrl));

		const ctx = makeCtx();
		let resolveLoadUrl!: () => void;
		loadURL.mockImplementationOnce(() => new Promise<void>(resolve => { resolveLoadUrl = resolve; }));

		const playPromiseA = playbackService.playSession(ctx, `sess-1`);
		await vi.waitFor(() => expect(loadURL).toHaveBeenCalledTimes(1));

		const playPromiseB = playbackService.playSession(ctx, `sess-1`);
		resolveLoadUrl();

		await expect(Promise.all([playPromiseA, playPromiseB])).resolves.not.toThrow();
	});

	test(`starting playback while none is active does not wait on anything from a prior run`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `navigate`, url: `https://example.com/a`, timestamp: 1 }
		]));

		const ctx = makeCtx();
		await playbackService.playSession(ctx, `sess-1`);

		expect(runHistoryService.markStopped).not.toHaveBeenCalled();
		expect(runHistoryService.finishRun).toHaveBeenCalledWith(`test-proj`, `run-1`);
	});
});
