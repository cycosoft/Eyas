import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CoreContext } from '@registry/eyas-core.js';
import type { EyasRecordingEnvelope, ClickStep, ScrollStep } from '@registry/recording.js';

vi.mock(`electron`, () => ({}));

const sendCommand = vi.fn().mockResolvedValue(undefined);
const attach = vi.fn();
const detach = vi.fn();
const isAttached = vi.fn().mockReturnValue(false);
const loadURL = vi.fn().mockResolvedValue(undefined);
const send = vi.fn();
const once = vi.fn();
const removeListener = vi.fn();

vi.mock(`@core/session-recorder.service.js`, () => ({
	default: { getSession: vi.fn(), setReplaying: vi.fn() }
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
		viewport: { width: 1024, height: 768 },
		components: {},
		recording: { title: `2026-01-01T00:00:00.000Z`, steps }
	};
}

function makeCtx(): CoreContext {
	return {
		$eyasLayer: { webContents: { send } },
		$testLayer: {
			webContents: {
				debugger: { attach, detach, isAttached, sendCommand },
				loadURL,
				once,
				removeListener
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
	send.mockClear();
});

describe(`sessionPlaybackService.playSession`, () => {
	test(`attaches the CDP debugger to the test layer and sends 'playing' status before dispatch`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(attach).toHaveBeenCalled();
		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, { status: `playing` });
	});

	test(`dispatches a ClickStep as Input.dispatchMouseEvent mousePressed then mouseReleased at the captured offset`, async () => {
		const step: ClickStep = { type: `click`, selectors: { primary: `#save`, fallbacks: [] }, offsetX: 12, offsetY: 34, timestamp: 1 };
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([step]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ type: `mousePressed`, x: 12, y: 34 }));
		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ type: `mouseReleased`, x: 12, y: 34 }));
	});

	test(`dispatches a change step as Input.insertText with the captured value`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `change`, selectors: { primary: `#name`, fallbacks: [] }, value: `hello`, timestamp: 1 }
		]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(sendCommand).toHaveBeenCalledWith(`Input.insertText`, { text: `hello` });
	});

	test(`dispatches keyDown/keyUp steps as Input.dispatchKeyEvent with the captured key`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `keyDown`, key: `a`, timestamp: 1 },
			{ type: `keyUp`, key: `a`, timestamp: 2 }
		]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchKeyEvent`, expect.objectContaining({ type: `keyDown`, key: `a` }));
		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchKeyEvent`, expect.objectContaining({ type: `keyUp`, key: `a` }));
	});

	test(`dispatches a ScrollStep as Input.dispatchMouseEvent with mouseWheel type at the captured position`, async () => {
		const step: ScrollStep = { type: `scroll`, x: 42, y: 84, timestamp: 1 };
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([step]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ type: `mouseWheel`, x: 42, y: 84 }));
	});

	test(`dispatches a NavigateStep by calling webContents.loadURL`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `navigate`, url: `https://example.com`, timestamp: 1 }
		]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(loadURL).toHaveBeenCalledWith(`https://example.com`);
	});

	test(`gracefully skips an unrecognized step type and continues to the next step`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `conditionalBlock` } as never,
			{ type: `navigate`, url: `https://example.com`, timestamp: 1 }
		]));
		const ctx = makeCtx();
		const warnSpy = vi.spyOn(console, `warn`).mockImplementation(() => {});

		await expect(playbackService.playSession(ctx, `sess-1`)).resolves.not.toThrow();

		expect(warnSpy).toHaveBeenCalled();
		expect(loadURL).toHaveBeenCalledWith(`https://example.com`);
		warnSpy.mockRestore();
	});

	test(`suppresses the recorder for the duration of dispatch so the replay doesn't record itself`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `navigate`, url: `https://example.com`, timestamp: 1 }
		]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		const calls = vi.mocked(sessionRecorderService.setReplaying).mock.calls.map(c => c[0]);
		expect(calls).toEqual([true, false]);
	});

	test(`sends 'stopped' status and detaches the debugger after all steps dispatch successfully`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, { status: `stopped` });
		expect(detach).toHaveBeenCalled();
	});

	test(`sends 'failed' status with the error message when a step dispatch throws, and detaches the debugger`, async () => {
		sendCommand.mockRejectedValueOnce(new Error(`boom`));
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `click`, selectors: { primary: `#save`, fallbacks: [] }, offsetX: 1, offsetY: 1, timestamp: 1 }
		]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, { status: `failed`, error: `boom` });
		expect(detach).toHaveBeenCalled();
	});

	test(`sends 'failed' status when no session is found for the given sessionId`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(null);
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `missing-session`);

		expect(send).toHaveBeenCalledWith(`recorder-playback-status`, expect.objectContaining({ status: `failed` }));
	});
});
