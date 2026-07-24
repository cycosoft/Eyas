import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ipcMain } from 'electron';
import type { CoreContext } from '@registry/eyas-core.js';
import type { ClickStep } from '@registry/recording.js';
import type { PopupId } from '@registry/primitives.js';

const { getPopupIdForWebContents, appendSteps } = vi.hoisted(() => ({
	getPopupIdForWebContents: vi.fn(),
	appendSteps: vi.fn()
}));

vi.mock(`electron`, () => ({
	ipcMain: { on: vi.fn(), handle: vi.fn() }
}));

vi.mock(`../../src/eyas-core/window.popups.js`, () => ({
	getPopupIdForWebContents
}));

vi.mock(`../../src/eyas-core/session-recorder.service.js`, () => ({
	appendSteps,
	stopRecording: vi.fn()
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
	selectors: { primary: `#save` as never, fallbacks: [] },
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
