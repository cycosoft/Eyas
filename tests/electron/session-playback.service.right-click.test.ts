import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CoreContext } from '@registry/eyas-core.js';
import type { EyasRecordingEnvelope, ClickStep } from '@registry/recording.js';

// Split out of session-playback.service.test.ts, which is at its max-lines ceiling.
//
// A right click reaches the page as a ClickStep carrying `button: 'secondary'`. The two things
// worth pinning down are that an absent `button` still replays as a left click (every session
// recorded before right-click capture looks like that) and that both halves of the mouse
// interaction are dispatched, since Blink derives `contextmenu` from only one of them.

vi.mock(`electron`, () => ({}));

const sendCommand = vi.fn().mockResolvedValue(undefined);
const executeJavaScript = vi.fn().mockResolvedValue({ x: 12, y: 34 });

vi.mock(`@core/session-recorder.service.js`, () => ({
	default: { getSession: vi.fn(), setReplaying: vi.fn() }
}));

vi.mock(`@core/window.popups.js`, () => ({
	getPopupWebContents: vi.fn().mockReturnValue(null),
	closePopup: vi.fn().mockResolvedValue(undefined),
	closeAllPopups: vi.fn().mockResolvedValue(undefined),
	setReplayPopupIdQueue: vi.fn(),
	clearReplayPopupIdQueue: vi.fn(),
	hideAllRecordingOverlays: vi.fn(),
	showAllRecordingOverlays: vi.fn()
}));

import sessionRecorderService from '@core/session-recorder.service.js';
import playbackService from '@core/session-playback.service.js';

function makeSession(steps: EyasRecordingEnvelope[`recording`][`steps`]): EyasRecordingEnvelope {
	return {
		eyasSchemaVersion: `1.0.0`,
		projectId: `test-proj`,
		sessionId: `sess-1`,
		title: `2026-01-01T00:00:00.000Z`,
		status: `stopped`,
		startedAt: 0,
		stoppedAt: 1,
		startUrl: null,
		viewport: { width: 1024, height: 768 },
		components: {},
		recording: { title: `2026-01-01T00:00:00.000Z`, steps }
	};
}

function makeCtx(): CoreContext {
	return {
		$eyasLayer: { webContents: { send: vi.fn() } },
		toggleEyasUI: vi.fn(),
		$testLayer: {
			webContents: {
				debugger: { attach: vi.fn(), detach: vi.fn(), isAttached: vi.fn().mockReturnValue(false), sendCommand },
				loadURL: vi.fn().mockResolvedValue(undefined),
				executeJavaScript,
				getURL: vi.fn().mockReturnValue(`https://example.com/`),
				once: vi.fn(),
				removeListener: vi.fn(),
				isLoading: vi.fn().mockReturnValue(false)
			}
		}
	} as unknown as CoreContext;
}

beforeEach(() => {
	vi.mocked(sessionRecorderService.getSession).mockReset();
	vi.mocked(sessionRecorderService.setReplaying).mockClear();
	sendCommand.mockClear();
	executeJavaScript.mockClear().mockResolvedValue({ x: 12, y: 34 });
});

describe(`right-click replay`, () => {
	test(`replays a button-less ClickStep as a left click, keeping pre-right-click sessions unchanged`, async () => {
		const step: ClickStep = { type: `click`, selectors: [`#save`], offsetX: 12, offsetY: 34, timestamp: 1 };
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([step]));

		await playbackService.playSession(makeCtx(), `sess-1`);

		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ type: `mousePressed`, button: `left` }));
		expect(sendCommand).not.toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ button: `right` }));
	});

	test(`replays a button: secondary ClickStep as a right click at the resolved position`, async () => {
		const step: ClickStep = { type: `click`, button: `secondary`, selectors: [`#grid-row`], offsetX: 12, offsetY: 34, timestamp: 1 };
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([step]));

		await playbackService.playSession(makeCtx(), `sess-1`);

		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ type: `mousePressed`, button: `right`, x: 12, y: 34 }));
	});

	test(`dispatches both press and release for a right click, since Blink synthesizes contextmenu from only one of them per platform`, async () => {
		const step: ClickStep = { type: `click`, button: `secondary`, selectors: [`#grid-row`], offsetX: 12, offsetY: 34, timestamp: 1 };
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([step]));

		await playbackService.playSession(makeCtx(), `sess-1`);

		// press alone replays as nothing on Windows/Linux, where contextmenu comes off the release
		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ type: `mouseReleased`, button: `right`, x: 12, y: 34 }));
	});
});
