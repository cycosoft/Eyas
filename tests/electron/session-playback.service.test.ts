import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CoreContext } from '@registry/eyas-core.js';
import type { EyasRecordingEnvelope, ClickStep, ScrollStep } from '@registry/recording.js';
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

vi.mock(`@core/session-recorder.service.js`, () => ({
	default: { getSession: vi.fn(), setReplaying: vi.fn() }
}));

vi.mock(`@core/settings-service.js`, () => ({
	default: { get: vi.fn().mockReturnValue(`no-delay`) }
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
	loadURL.mockClear();
	executeJavaScript.mockClear().mockResolvedValue(undefined);
	isLoading.mockClear().mockReturnValue(false);
	send.mockClear();
	getURL.mockClear().mockReturnValue(`https://example.com/`);
	popupSendCommand.mockClear();
	popupAttach.mockClear();
	popupDetach.mockClear();
	popupLoadURL.mockClear();
	popupWebContents.isLoading.mockReset().mockReturnValue(false);
	popupWebContents.once.mockReset();
	popupWebContents.executeJavaScript.mockReset().mockResolvedValue(undefined);
	getPopupWebContents.mockReset().mockReturnValue(null);
	closePopup.mockClear().mockResolvedValue(undefined);
	setReplayPopupIdQueue.mockClear();
	clearReplayPopupIdQueue.mockClear();
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

	test(`dispatches a ClickStep at the selector-resolved coordinates instead of the raw recorded offset, when the selector resolves to an element`, async () => {
		executeJavaScript.mockResolvedValueOnce({ x: 99, y: 88 });
		const step: ClickStep = { type: `click`, selectors: { primary: `#save`, fallbacks: [] }, offsetX: 12, offsetY: 34, timestamp: 1 };
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([step]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(executeJavaScript).toHaveBeenCalledWith(expect.stringContaining(`#save`));
		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ type: `mousePressed`, x: 99, y: 88 }));
		expect(sendCommand).not.toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ x: 12, y: 34 }));
	});

	test(`falls back to the raw recorded offset when none of the step's selectors resolve to an element`, async () => {
		executeJavaScript.mockResolvedValueOnce(null);
		const step: ClickStep = { type: `click`, selectors: { primary: `#gone`, fallbacks: [] }, offsetX: 12, offsetY: 34, timestamp: 1 };
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([step]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ type: `mousePressed`, x: 12, y: 34 }));
	});

	test(`waits for the target to finish loading before dispatching a click against it, e.g. a popup still loading its first page`, async () => {
		getPopupWebContents.mockReturnValue(popupWebContents);
		popupWebContents.isLoading.mockReturnValue(true);
		let stopLoadingCb: (() => void) | undefined;
		popupWebContents.once.mockImplementation((event, cb) => { if (event === `did-stop-loading`) { stopLoadingCb = cb; } });
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `click`, selectors: { primary: `#in-popup`, fallbacks: [] }, offsetX: 1, offsetY: 1, popupId: `popup-1`, timestamp: 1 } as never
		]));
		const ctx = makeCtx();

		const playPromise = playbackService.playSession(ctx, `sess-1`);
		await Promise.resolve();
		await Promise.resolve();
		expect(popupSendCommand).not.toHaveBeenCalled();

		popupWebContents.isLoading.mockReturnValue(false);
		stopLoadingCb?.();
		await playPromise;

		expect(popupSendCommand).toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ type: `mousePressed`, x: 1, y: 1 }));
		popupWebContents.isLoading.mockReturnValue(false);
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

	test(`dispatches a ScrollStep by setting window.scrollTo to the captured absolute scroll position`, async () => {
		const step: ScrollStep = { type: `scroll`, x: 42, y: 84, timestamp: 1 };
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([step]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(executeJavaScript).toHaveBeenCalledWith(expect.stringContaining(`window.scrollTo(42, 84)`));
	});

	test(`dispatches a NavigateStep by calling webContents.loadURL`, async () => {
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `navigate`, url: `https://example.com`, timestamp: 1 }
		]));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(loadURL).toHaveBeenCalledWith(`https://example.com`);
	});

	test(`navigates to the session's startUrl first when replaying from a different view than recording started on, so playback isn't stranded on the current page`, async () => {
		getURL.mockReturnValue(`https://example.com/other-view`);
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `click`, selectors: { primary: `#open-window`, fallbacks: [] }, offsetX: 1, offsetY: 1, timestamp: 1 }
		], `https://example.com/`));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(loadURL).toHaveBeenNthCalledWith(1, `https://example.com/`);
	});

	test(`waits for two real paint frames after navigating to startUrl before dispatching the first step, so the page is actually interactive before receiving input`, async () => {
		getURL.mockReturnValue(`https://example.com/other-view`);
		let resolvePaint: () => void = () => {};
		executeJavaScript.mockReturnValue(new Promise<void>(resolve => { resolvePaint = resolve; }));
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `click`, selectors: { primary: `#open-window`, fallbacks: [] }, offsetX: 1, offsetY: 1, timestamp: 1 }
		], `https://example.com/`));
		const ctx = makeCtx();

		const playPromise = playbackService.playSession(ctx, `sess-1`);
		await Promise.resolve();
		await Promise.resolve();
		expect(loadURL).toHaveBeenCalledWith(`https://example.com/`);
		expect(sendCommand).not.toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ type: `mousePressed`, x: 1, y: 1 }));

		resolvePaint();
		await playPromise;

		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchMouseEvent`, expect.objectContaining({ type: `mousePressed`, x: 1, y: 1 }));
	});

	test(`does not navigate to startUrl when playback is already on that page`, async () => {
		getURL.mockReturnValue(`https://example.com/`);
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `click`, selectors: { primary: `#open-window`, fallbacks: [] }, offsetX: 1, offsetY: 1, timestamp: 1 }
		], `https://example.com/`));
		const ctx = makeCtx();

		await playbackService.playSession(ctx, `sess-1`);

		expect(loadURL).not.toHaveBeenCalled();
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

	test(`does not wait between steps when replaySpeed is 'no-delay' (the default)`, async () => {
		vi.mocked(settingsService.get).mockReturnValue(`no-delay`);
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `navigate`, url: `https://example.com/a`, timestamp: 1 },
			{ type: `navigate`, url: `https://example.com/b`, timestamp: 2 }
		]));
		const ctx = makeCtx();
		const setTimeoutSpy = vi.spyOn(global, `setTimeout`);

		await playbackService.playSession(ctx, `sess-1`);

		expect(setTimeoutSpy).not.toHaveBeenCalled();
		setTimeoutSpy.mockRestore();
	});

	test(`waits between steps when replaySpeed is 'natural'`, async () => {
		vi.useFakeTimers();
		vi.mocked(settingsService.get).mockReturnValue(`natural`);
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([
			{ type: `navigate`, url: `https://example.com/a`, timestamp: 1 },
			{ type: `navigate`, url: `https://example.com/b`, timestamp: 2 },
			{ type: `navigate`, url: `https://example.com/c`, timestamp: 3 }
		]));
		const ctx = makeCtx();
		const setTimeoutSpy = vi.spyOn(global, `setTimeout`);

		const playPromise = playbackService.playSession(ctx, `sess-1`);
		await vi.advanceTimersByTimeAsync(1000);
		await playPromise;

		// one delay between each pair of steps: 3 steps → 2 waits, not a wait before the first step
		expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
		expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 500);
		expect(loadURL).toHaveBeenNthCalledWith(1, `https://example.com/a`);
		expect(loadURL).toHaveBeenNthCalledWith(3, `https://example.com/c`);
		setTimeoutSpy.mockRestore();
		vi.useRealTimers();
	});

	test(`dispatches a step carrying a popupId against that exact popup's webContents/debugger instead of the test layer's`, async () => {
		getPopupWebContents.mockReturnValue(popupWebContents);
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
