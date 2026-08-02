import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { CoreContext } from '@registry/eyas-core.js';
import type { EyasRecordingEnvelope, KeyDownStep } from '@registry/recording.js';

// Split out of session-playback.service.test.ts, which is at its max-lines ceiling.
//
// A keystroke recorded in a contenteditable root carries no cursor selection, so it can't take the
// `.value` splice path (a rich-text editor has no `.value` to splice). It falls through to CDP —
// where a key event carrying only `key` types nothing. These pin down the fields that make Blink
// actually perform the edit, and that input/textarea replay is untouched by them.

vi.mock(`electron`, () => ({}));

const sendCommand = vi.fn().mockResolvedValue(undefined);
const executeJavaScript = vi.fn().mockResolvedValue(undefined);

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

async function replay(step: KeyDownStep): Promise<void> {
	vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession([step]));
	await playbackService.playSession(makeCtx(), `sess-1`);
}

beforeEach(() => {
	vi.mocked(sessionRecorderService.getSession).mockReset();
	vi.mocked(sessionRecorderService.setReplaying).mockClear();
	sendCommand.mockClear();
	executeJavaScript.mockClear().mockResolvedValue(undefined);
});

describe(`contenteditable keystroke replay`, () => {
	test(`sends text alongside key for a printable character, which is what makes Blink insert it`, async () => {
		await replay({ type: `keyDown`, key: `h`, timestamp: 1 });

		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchKeyEvent`, expect.objectContaining({ type: `keyDown`, key: `h`, text: `h` }));
	});

	test(`sends Backspace as virtual key code 8 rather than as inserted text`, async () => {
		await replay({ type: `keyDown`, key: `Backspace`, timestamp: 1 });

		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchKeyEvent`, expect.objectContaining({ key: `Backspace`, windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 }));
		// `text: 'Backspace'` would type the literal word into the editor
		expect(sendCommand).not.toHaveBeenCalledWith(`Input.dispatchKeyEvent`, expect.objectContaining({ text: expect.anything() }));
	});

	test(`sends Delete as virtual key code 46`, async () => {
		await replay({ type: `keyDown`, key: `Delete`, timestamp: 1 });

		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchKeyEvent`, expect.objectContaining({ key: `Delete`, windowsVirtualKeyCode: 46, nativeVirtualKeyCode: 46 }));
	});

	test(`adds neither text nor a key code to a functional key like Enter, which the page handles itself`, async () => {
		await replay({ type: `keyDown`, key: `Enter`, timestamp: 1 });

		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchKeyEvent`, { type: `keyDown`, key: `Enter` });
	});

	test(`sends no text for the character half of a chord, so Ctrl+A selects all instead of typing "a"`, async () => {
		// KeyDownStep carries no modifier state, and `key` for Ctrl+A is a bare `a` — the held
		// Control has to be inferred from the preceding step or the chord replays as literal text
		const steps: KeyDownStep[] = [{ type: `keyDown`, key: `Control`, timestamp: 1 }, { type: `keyDown`, key: `a`, timestamp: 2 }];
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession(steps));

		await playbackService.playSession(makeCtx(), `sess-1`);

		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchKeyEvent`, { type: `keyDown`, key: `a` });
		expect(sendCommand).not.toHaveBeenCalledWith(`Input.dispatchKeyEvent`, expect.objectContaining({ text: `a` }));
	});

	test(`resumes inserting text once the modifier is released`, async () => {
		const steps: EyasRecordingEnvelope[`recording`][`steps`] = [
			{ type: `keyDown`, key: `Control`, timestamp: 1 },
			{ type: `keyDown`, key: `a`, timestamp: 2 },
			{ type: `keyUp`, key: `Control`, timestamp: 3 },
			{ type: `keyDown`, key: `b`, timestamp: 4 }
		];
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession(steps));

		await playbackService.playSession(makeCtx(), `sess-1`);

		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchKeyEvent`, expect.objectContaining({ key: `b`, text: `b` }));
	});

	test(`treats Shift as a text modifier, since the recorded key is already in its shifted form`, async () => {
		const steps: EyasRecordingEnvelope[`recording`][`steps`] = [
			{ type: `keyDown`, key: `Shift`, timestamp: 1 },
			{ type: `keyDown`, key: `A`, timestamp: 2 }
		];
		vi.mocked(sessionRecorderService.getSession).mockResolvedValue(makeSession(steps));

		await playbackService.playSession(makeCtx(), `sess-1`);

		expect(sendCommand).toHaveBeenCalledWith(`Input.dispatchKeyEvent`, expect.objectContaining({ key: `A`, text: `A` }));
	});

	test(`leaves input/textarea replay on the value-splice path, dispatching no key event at all`, async () => {
		await replay({ type: `keyDown`, key: `h`, selectionStart: 0, selectionEnd: 0, timestamp: 1 });

		expect(executeJavaScript).toHaveBeenCalled();
		expect(sendCommand).not.toHaveBeenCalledWith(`Input.dispatchKeyEvent`, expect.anything());
	});
});
