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
const executeJavaScript = vi.fn().mockResolvedValue({ x: 1, y: 1 });
const send = vi.fn();
const once = vi.fn();
const removeListener = vi.fn();
const isLoading = vi.fn().mockReturnValue(false);
const toggleEyasUI = vi.fn();

vi.mock(`@core/session-recorder.service.js`, () => ({
	default: { getSession: vi.fn(), setReplaying: vi.fn() }
}));

vi.mock(`@core/window.popups.js`, () => ({
	getPopupWebContents: vi.fn(),
	closePopup: vi.fn().mockResolvedValue(undefined),
	closeAllPopups: vi.fn().mockResolvedValue(undefined),
	setReplayPopupIdQueue: vi.fn(),
	clearReplayPopupIdQueue: vi.fn()
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
	sendCommand.mockClear();
	attach.mockClear();
	detach.mockClear();
	loadURL.mockClear();
	executeJavaScript.mockClear().mockResolvedValue({ x: 1, y: 1 });
	send.mockClear();
	toggleEyasUI.mockClear();
	getURL.mockClear().mockReturnValue(`https://example.com/`);
});

describe(`sessionPlaybackService.playSession progress reporting`, () => {
	test(`counts a click and the navigate it caused as a single progress step, not two`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `click`, selectors: [`#link`], offsetX: 1, offsetY: 1, timestamp: 1 },
			{ type: `navigate`, url: `https://example.com/next`, timestamp: 2 }
		]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, { status: `playing`, completedSteps: 0, totalSteps: 1 });
		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, { status: `playing`, completedSteps: 1, totalSteps: 1 });
		expect(send).not.toHaveBeenCalledWith(`recorder-playback-status`, expect.objectContaining({ completedSteps: 2 }));
	});

	test(`folds a redirect chain (multiple navigate steps after one click) into that click's single progress step`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `click`, selectors: [`#link`], offsetX: 1, offsetY: 1, timestamp: 1 },
			{ type: `navigate`, url: `https://example.com/hop1`, timestamp: 2 },
			{ type: `navigate`, url: `https://example.com/hop2`, timestamp: 3 }
		]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, { status: `playing`, completedSteps: 0, totalSteps: 1 });
		expect(send).not.toHaveBeenCalledWith(`recorder-playback-status`, expect.objectContaining({ completedSteps: 2 }));
	});

	test(`does not count a scroll step toward progress`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `click`, selectors: [`#link`], offsetX: 1, offsetY: 1, timestamp: 1 },
			{ type: `scroll`, x: 0, y: 100, timestamp: 2 },
			{ type: `click`, selectors: [`#other`], offsetX: 2, offsetY: 2, timestamp: 3 }
		]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, { status: `playing`, completedSteps: 0, totalSteps: 2 });
		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, { status: `playing`, completedSteps: 1, totalSteps: 2 });
		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, { status: `playing`, completedSteps: 2, totalSteps: 2 });
	});
});
