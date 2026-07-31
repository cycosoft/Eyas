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
	default: { getSession: vi.fn(), setReplaying: vi.fn() }
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
import settingsService from '@core/settings-service.js';
import playbackService from '@core/session-playback.service.js';

const getURL = vi.fn().mockReturnValue(`https://example.com/`);

function makeSession(steps: EyasRecordingEnvelope[`recording`][`steps`], startUrl: DomainUrl | null = null): EyasRecordingEnvelope {
	return {
		eyasSchemaVersion: `1.0.0`,
		projectId: `test-proj`,
		sessionId: `sess-1`,
		title: `2026-01-01T00:00:00.000Z`,
		status: `stopped`,
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
		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, { status: `stopped` });
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
