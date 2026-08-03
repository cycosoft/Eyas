import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CoreContext } from '@registry/eyas-core.js';
import type { EyasRecordingEnvelope, ClickStep } from '@registry/recording.js';
import type { SchemaVersion } from '@registry/primitives.js';

// Split out of session-playback.service.test.ts, which is at its max-lines ceiling.
//
// A session written by a newer build loses its unrecognized steps to _dispatchStep's default branch
// — a 1.2.0 recording replays a rich-text editor empty on a 1.1.0 build, with no error. That's
// survivable, but only if the tester is told, and told at the start rather than after sitting
// through a run whose result they'd otherwise trust. These pin the warning to the `playing` payload
// and pin its absence for every session this build can actually read.

vi.mock(`electron`, () => ({}));

const sendCommand = vi.fn().mockResolvedValue(undefined);
const send = vi.fn();

vi.mock(`@core/session-recorder.service.js`, () => ({
	default: { getSession: vi.fn(), setReplaying: vi.fn(), isUnknownSchema: vi.fn().mockReturnValue(false) }
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

function makeSession(version: SchemaVersion, steps: EyasRecordingEnvelope[`recording`][`steps`] = []): EyasRecordingEnvelope {
	return {
		// the cast is the situation being tested: a file from a newer build carries a version the
		// envelope type says can't exist
		eyasSchemaVersion: version,
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
	} as unknown as EyasRecordingEnvelope;
}

function makeCtx(): CoreContext {
	return {
		$eyasLayer: { webContents: { send } },
		toggleEyasUI: vi.fn(),
		$testLayer: {
			webContents: {
				debugger: { attach: vi.fn(), detach: vi.fn(), isAttached: vi.fn().mockReturnValue(false), sendCommand },
				loadURL: vi.fn().mockResolvedValue(undefined),
				executeJavaScript: vi.fn().mockResolvedValue({ x: 1, y: 1 }),
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
	vi.mocked(sessionRecorderService.isUnknownSchema).mockReset().mockReturnValue(false);
	sendCommand.mockClear();
	send.mockClear();
});

describe(`sessionPlaybackService.playSession — unreadable schema versions`, () => {
	test(`warns before dispatching anything, naming the format the tester would need to match`, async () => {
		vi.mocked(sessionRecorderService.isUnknownSchema).mockReturnValue(true);
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession(`9.9.9`));

		await playbackService.playSession(makeCtx(), `sess-1`);

		// on `playing`, not on the final status: a warning that arrives after the run can't stop the
		// tester from having drawn a conclusion from a replay that was never going to be complete
		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, expect.objectContaining({
			status: `playing`,
			schemaWarning: expect.stringContaining(`9.9.9`)
		}));
	});

	test(`still replays the steps it does understand rather than refusing the session`, async () => {
		vi.mocked(sessionRecorderService.isUnknownSchema).mockReturnValue(true);
		const step: ClickStep = { type: `click`, selectors: [`#save`], offsetX: 12, offsetY: 34, timestamp: 1 };
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession(`9.9.9`, [step]));

		await playbackService.playSession(makeCtx(), `sess-1`);

		// a degraded run the tester has been warned about beats no run at all — most of a recording is
		// step types that have been stable across every version so far
		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ type: `mousePressed` }));
		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, expect.objectContaining({ status: `stopped` }));
	});

	test(`says nothing about the schema for a session this build understands`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession(`1.2.0`));

		await playbackService.playSession(makeCtx(), `sess-1`);

		// the ordinary `playing` payload has to stay byte-identical — an always-present field would
		// make every existing exact-shape assertion on it a lie, and cry wolf on every normal replay
		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, expect.not.objectContaining({ schemaWarning: expect.anything() }));
	});
});
