import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ipcMain } from 'electron';
import type { CoreContext } from '@registry/eyas-core.js';
import type { ClickStep } from '@registry/recording.js';
import type { PopupId, ChannelName } from '@registry/primitives.js';

const { getPopupIdForWebContents, appendSteps, startSession, listSessions, getSession } = vi.hoisted(() => ({
	getPopupIdForWebContents: vi.fn(),
	appendSteps: vi.fn(),
	startSession: vi.fn().mockResolvedValue(undefined),
	listSessions: vi.fn().mockResolvedValue([]),
	getSession: vi.fn().mockResolvedValue(null)
}));

vi.mock(`electron`, () => ({
	ipcMain: { on: vi.fn(), handle: vi.fn() }
}));

vi.mock(`../../src/eyas-core/window.popups.js`, () => ({
	getPopupIdForWebContents
}));

vi.mock(`../../src/eyas-core/session-recorder.service.js`, () => ({
	appendSteps,
	stopRecording: vi.fn(),
	startSession,
	listSessions,
	getSession
}));

const { stopPlayback } = vi.hoisted(() => ({
	stopPlayback: vi.fn()
}));

vi.mock(`../../src/eyas-core/session-playback.service.js`, () => ({
	default: { playSession: vi.fn(), stopPlayback }
}));

import { initRecorderIpcListeners } from '@core/ipc-handlers.recorder.js';

function getFlushHandler(): (event: unknown, steps: unknown) => void {
	let handler: ((event: unknown, steps: unknown) => void) | null = null;
	vi.spyOn(ipcMain, `on`).mockImplementation((channel, cb) => {
		if (channel === `recorder-flush-steps`) { handler = cb as never; }
		return ipcMain;
	});
	initRecorderIpcListeners({} as CoreContext);
	if (!handler) { throw new Error(`recorder-flush-steps handler was not registered`); }
	return handler;
}

const makeClickStep = (): ClickStep => ({
	type: `click`,
	selectors: [`#save`],
	offsetX: 0 as never,
	offsetY: 0 as never,
	timestamp: Date.now() as never
});

describe(`recorder-flush-steps IPC handler`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test(`passes steps through untagged when the sender is not a tracked popup (the main test layer)`, () => {
		getPopupIdForWebContents.mockReturnValue(undefined);
		const handler = getFlushHandler();
		const step = makeClickStep();

		handler({ sender: { id: 1 } }, [step]);

		expect(appendSteps).toHaveBeenCalledWith([step]);
	});

	test(`tags every step in the flush with the popupId resolved from the sending webContents, overriding any client-supplied value`, () => {
		getPopupIdForWebContents.mockReturnValue(`popup-a` as PopupId);
		const handler = getFlushHandler();
		const step = makeClickStep();

		handler({ sender: { id: 5 } }, [step]);

		expect(appendSteps).toHaveBeenCalledWith([{ ...step, popupId: `popup-a` }]);
	});
});

describe(`recorder-record-start IPC handler`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
		startSession.mockResolvedValue(undefined);
	});

	test(`calls sessionRecorderService.startSession with the current context`, () => {
		const ctx = {} as CoreContext;
		initRecorderIpcListeners(ctx);

		const registeredCall = vi.mocked(ipcMain.on).mock.calls.find(call => call[0] === `recorder-record-start`);
		if (!registeredCall) { throw new Error(`recorder-record-start handler was not registered`); }
		const handler = registeredCall[1] as (...args: unknown[]) => void;

		handler();

		expect(startSession).toHaveBeenCalledWith(ctx);
	});
});

describe(`recorder-replay-stop IPC handler`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test(`calls sessionPlaybackService.stopPlayback`, () => {
		initRecorderIpcListeners({} as CoreContext);

		const registeredCall = vi.mocked(ipcMain.on).mock.calls.find(call => call[0] === `recorder-replay-stop`);
		if (!registeredCall) { throw new Error(`recorder-replay-stop handler was not registered`); }
		const handler = registeredCall[1] as (...args: unknown[]) => void;

		handler();

		expect(stopPlayback).toHaveBeenCalled();
	});
});

function getHandler(channel: ChannelName): (...args: unknown[]) => void {
	const registeredCall = vi.mocked(ipcMain.on).mock.calls.find(call => call[0] === channel);
	if (!registeredCall) { throw new Error(`${channel} handler was not registered`); }
	return registeredCall[1] as (...args: unknown[]) => void;
}

describe(`recorder-list-sessions IPC handler`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test(`sends the resolved session list back over recorder-sessions-listed`, async () => {
		const send = vi.fn();
		const ctx = { $eyasLayer: { webContents: { send } } } as unknown as CoreContext;
		const summaries = [{ sessionId: `s1`, title: `t`, status: `stopped`, startedAt: 1, stoppedAt: 2, stepCount: 0 }];
		listSessions.mockResolvedValue(summaries);
		initRecorderIpcListeners(ctx);

		getHandler(`recorder-list-sessions`)();
		await Promise.resolve();
		await Promise.resolve();

		expect(listSessions).toHaveBeenCalledWith(ctx);
		expect(send).toHaveBeenCalledWith(`recorder-sessions-listed`, summaries);
	});

	test(`does not throw when the webContents layer is unavailable and listing rejects`, async () => {
		const ctx = {} as CoreContext;
		listSessions.mockRejectedValue(new Error(`disk error`));
		initRecorderIpcListeners(ctx);

		expect(() => getHandler(`recorder-list-sessions`)()).not.toThrow();
		await Promise.resolve();
	});
});

describe(`recorder-get-session IPC handler`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test(`sends the resolved session back over recorder-session-loaded`, async () => {
		const send = vi.fn();
		const ctx = { $eyasLayer: { webContents: { send } } } as unknown as CoreContext;
		const session = { sessionId: `s1`, recording: { steps: [] } };
		getSession.mockResolvedValue(session);
		initRecorderIpcListeners(ctx);

		getHandler(`recorder-get-session`)({}, { sessionId: `s1` });
		await Promise.resolve();
		await Promise.resolve();

		expect(getSession).toHaveBeenCalledWith(ctx, `s1`);
		expect(send).toHaveBeenCalledWith(`recorder-session-loaded`, session);
	});
});
