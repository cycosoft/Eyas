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
const toggleEyasUI = vi.fn();

vi.mock(`@core/session-recorder.service.js`, () => ({
	default: { getSession: vi.fn(), setReplaying: vi.fn(), isUnknownSchema: vi.fn().mockReturnValue(false) }
}));

vi.mock(`@core/run-history.service.js`, () => ({
	default: {
		startRun: vi.fn().mockResolvedValue(`run-1`),
		recordStepStart: vi.fn().mockResolvedValue(undefined),
		finishRun: vi.fn().mockResolvedValue(undefined)
	}
}));

vi.mock(`@core/window.popups.js`, () => ({
	getPopupWebContents: vi.fn(),
	closePopup: vi.fn().mockResolvedValue(undefined),
	closeAllPopups: vi.fn().mockResolvedValue(undefined),
	setReplayPopupIdQueue: vi.fn(),
	clearReplayPopupIdQueue: vi.fn(),
	hideAllRecordingOverlays: vi.fn(),
	showAllRecordingOverlays: vi.fn()
}));

import sessionRecorderService from '@core/session-recorder.service.js';
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
		toggleEyasUI,
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
	loadURL.mockClear();
	executeJavaScript.mockClear().mockResolvedValue({ x: 1, y: 1 });
	send.mockClear();
	getURL.mockClear().mockReturnValue(`https://example.com/`);
});

describe(`sessionPlaybackService.playSession — step pacing`, () => {
	test(`waits between steps using the natural delay, regardless of any persisted replaySpeed setting`, async () => {
		vi.useFakeTimers();
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `navigate`, url: `https://example.com/a`, timestamp: 1 },
			{ type: `navigate`, url: `https://example.com/b`, timestamp: 2 },
			{ type: `navigate`, url: `https://example.com/c`, timestamp: 3 }
		]));
		const ctx = makeCtx();
		const setTimeoutSpy = vi.spyOn(global, `setTimeout`);

		const playPromise = playbackService.playSession(ctx, `sess-1`);
		await vi.advanceTimersByTimeAsync(1700);
		await playPromise;

		// a delay applies before every step, including the first: 3 steps -> 3 waits (a 4th
		// setTimeout call schedules the UI layer's post-playback collapse, unrelated to step pacing)
		const stepDelayCalls = setTimeoutSpy.mock.calls.filter(call => call[1] === 500);
		expect(stepDelayCalls).toHaveLength(3);
		expect(loadURL).toHaveBeenNthCalledWith(1, `https://example.com/a`);
		expect(loadURL).toHaveBeenNthCalledWith(3, `https://example.com/c`);
		setTimeoutSpy.mockRestore();
		vi.useRealTimers();
	});

	test(`waits before dispatching the very first step, not just between later steps`, async () => {
		vi.useFakeTimers();
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `navigate`, url: `https://example.com/a`, timestamp: 1 }
		]));
		const ctx = makeCtx();

		const playPromise = playbackService.playSession(ctx, `sess-1`);
		await Promise.resolve();
		await Promise.resolve();
		expect(loadURL).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(700);
		await playPromise;

		expect(loadURL).toHaveBeenCalledWith(`https://example.com/a`);
		vi.useRealTimers();
	});
});
