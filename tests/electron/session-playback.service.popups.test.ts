import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CoreContext } from '@registry/eyas-core.js';
import type { EyasRecordingEnvelope } from '@registry/recording.js';
import type { DomainUrl, PopupId } from '@registry/primitives.js';

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
	default: { getSession: vi.fn(), setReplaying: vi.fn() }
}));

const { getPopupWebContents, closePopup, setReplayPopupIdQueue, clearReplayPopupIdQueue } = vi.hoisted(() => ({
	getPopupWebContents: vi.fn(),
	closePopup: vi.fn().mockResolvedValue(undefined),
	setReplayPopupIdQueue: vi.fn(),
	clearReplayPopupIdQueue: vi.fn()
}));

vi.mock(`@core/window.popups.js`, () => ({
	getPopupWebContents,
	closePopup,
	setReplayPopupIdQueue,
	clearReplayPopupIdQueue
}));

const popupSendCommand = vi.fn().mockResolvedValue(undefined);
const popupAttach = vi.fn();
const popupDetach = vi.fn();
const popupLoadURL = vi.fn().mockResolvedValue(undefined);
const popupWebContents = {
	debugger: { attach: popupAttach, detach: popupDetach, isAttached: vi.fn().mockReturnValue(false), sendCommand: popupSendCommand },
	loadURL: popupLoadURL,
	isLoading: vi.fn().mockReturnValue(false),
	executeJavaScript: vi.fn().mockResolvedValue(undefined),
	once: vi.fn()
};

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
	// default to a resolved click point so click steps don't burn a real 5s poll waiting for one
	executeJavaScript.mockClear().mockResolvedValue({ x: 1, y: 1 });
	isLoading.mockClear().mockReturnValue(false);
	send.mockClear();
	toggleEyasUI.mockClear();
	getURL.mockClear().mockReturnValue(`https://example.com/`);
	popupSendCommand.mockClear();
	popupAttach.mockClear();
	popupDetach.mockClear();
	popupLoadURL.mockClear();
	popupWebContents.isLoading.mockReset().mockReturnValue(false);
	popupWebContents.once.mockReset();
	popupWebContents.executeJavaScript.mockReset().mockResolvedValue({ x: 1, y: 1 });
	getPopupWebContents.mockReset().mockReturnValue(null);
	closePopup.mockClear().mockResolvedValue(undefined);
	setReplayPopupIdQueue.mockClear();
	clearReplayPopupIdQueue.mockClear();
});

describe(`sessionPlaybackService.playSession — popup routing`, () => {
	test(`dispatches a step carrying a popupId against that exact popup's webContents/debugger instead of the test layer's`, async () => {
		getPopupWebContents.mockReturnValue(popupWebContents);
		popupWebContents.executeJavaScript.mockReset().mockResolvedValue({ x: 5, y: 6 });
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `click`, selectors: { primary: `#in-popup`, fallbacks: [] }, offsetX: 5, offsetY: 6, popupId: `popup-1`, timestamp: 1 } as never
		]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(getPopupWebContents).toHaveBeenCalledWith(`popup-1`);
		expect(popupSendCommand).toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ type: `mousePressed`, x: 5, y: 6 }));
		expect(sendCommand).not.toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ type: `mousePressed`, x: 5, y: 6 }));
	});

	test(`routes steps from two different popups to their respective webContents without cross-talk`, async () => {
		const popupOneWebContents = { ...popupWebContents, debugger: { ...popupWebContents.debugger, sendCommand: vi.fn().mockResolvedValue(undefined) } };
		const popupTwoWebContents = { ...popupWebContents, debugger: { ...popupWebContents.debugger, sendCommand: vi.fn().mockResolvedValue(undefined) } };
		getPopupWebContents.mockImplementation((id: PopupId) => (id === `popup-1` ? popupOneWebContents : popupTwoWebContents));
		// both popups share the base popupWebContents.executeJavaScript mock via spread — resolve
		// each click's target point in dispatch order so the two popups don't get cross-talked
		popupWebContents.executeJavaScript.mockReset()
			.mockResolvedValueOnce({ x: 1, y: 1 })
			.mockResolvedValueOnce({ x: 2, y: 2 });
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `click`, selectors: { primary: `#a`, fallbacks: [] }, offsetX: 1, offsetY: 1, popupId: `popup-1`, timestamp: 1 } as never,
			{ type: `click`, selectors: { primary: `#b`, fallbacks: [] }, offsetX: 2, offsetY: 2, popupId: `popup-2`, timestamp: 2 } as never
		]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(popupOneWebContents.debugger.sendCommand).toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ x: 1, y: 1 }));
		expect(popupTwoWebContents.debugger.sendCommand).toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ x: 2, y: 2 }));
		expect(popupOneWebContents.debugger.sendCommand).not.toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ x: 2, y: 2 }));
	});

	test(`dispatching a closeWindow step closes the popup matching its popupId`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `closeWindow`, popupId: `popup-1`, timestamp: 1 } as never
		]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(closePopup).toHaveBeenCalledWith(`popup-1`);
	});

	test(`skips a step with a popupId that isn't currently tracked, logging a warning, instead of throwing`, async () => {
		getPopupWebContents.mockReturnValue(null);
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `click`, selectors: { primary: `#gone`, fallbacks: [] }, offsetX: 1, offsetY: 1, popupId: `popup-1`, timestamp: 1 } as never
		]));
		const ctx = makeCtx();
		const warnSpy = vi.spyOn(console, `warn`).mockImplementation(() => {});

		await expect(playbackService.playSession(ctx, `sess-1`)).resolves.not.toThrow();

		expect(warnSpy).toHaveBeenCalled();
		expect(sendCommand).not.toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ x: 1, y: 1 }));
		warnSpy.mockRestore();
	});

	test(`primes the replay popup id queue with each step's popupId in first-appearance order before dispatch, and clears it after, so a popup re-opened during replay is assigned the same id it was recorded with`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `click`, selectors: { primary: `#open`, fallbacks: [] }, offsetX: 1, offsetY: 1, popupId: `popup-1`, timestamp: 1 } as never,
			{ type: `click`, selectors: { primary: `#in-popup`, fallbacks: [] }, offsetX: 2, offsetY: 2, popupId: `popup-1`, timestamp: 2 } as never,
			{ type: `closeWindow`, popupId: `popup-2`, timestamp: 3 } as never
		]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(setReplayPopupIdQueue).toHaveBeenCalledWith([`popup-1`, `popup-2`]);
		expect(clearReplayPopupIdQueue).toHaveBeenCalled();
	});
});
