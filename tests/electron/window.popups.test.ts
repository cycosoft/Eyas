import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { PopupId } from '@registry/primitives.js';

const { randomUUID, appendCloseWindowStep } = vi.hoisted(() => ({
	randomUUID: vi.fn(),
	appendCloseWindowStep: vi.fn()
}));

vi.mock(`crypto`, () => ({ randomUUID }));

vi.mock(`@core/session-recorder.service.js`, () => ({
	default: { appendCloseWindowStep }
}));

import { registerPopupTracking, getPopupWebContents, closePopup } from '@core/window.popups.js';

type MockFn = ReturnType<typeof vi.fn>;
type MockEventName = string;
type ClosedListener = () => void;

type FakePopupDebugger = {
	attach: MockFn;
	detach: MockFn;
}

type FakePopupWebContents = {
	debugger: FakePopupDebugger;
	executeJavaScript: MockFn;
}

type FakePopup = {
	webContents: FakePopupWebContents;
	isDestroyed: MockFn;
	close: MockFn;
	on: MockFn;
	once: MockFn;
	_emitClosed: ClosedListener;
}

type FakeTestWebContents = {
	on: MockFn;
	_emitCreateWindow: (win: FakePopup) => void;
}

function makeFakePopup(): FakePopup {
	const closedHandlers: ClosedListener[] = [];
	const registerClosedListener = (event: MockEventName, cb: ClosedListener): void => {
		if (event === `closed`) { closedHandlers.push(cb); }
	};

	const popup: FakePopup = {
		webContents: {
			debugger: { attach: vi.fn(), detach: vi.fn() },
			executeJavaScript: vi.fn().mockResolvedValue(undefined)
		},
		isDestroyed: vi.fn().mockReturnValue(false),
		close: vi.fn(() => popup._emitClosed()),
		on: vi.fn(registerClosedListener),
		once: vi.fn(registerClosedListener),
		_emitClosed: () => closedHandlers.forEach(cb => cb())
	};
	return popup;
}

function makeTestWebContents(): FakeTestWebContents {
	let createHandler: ((win: FakePopup) => void) | null = null;
	const registerCreateHandler = (event: MockEventName, cb: (win: FakePopup) => void): void => {
		if (event === `did-create-window`) { createHandler = cb; }
	};

	return {
		on: vi.fn(registerCreateHandler),
		_emitCreateWindow: (win: FakePopup): void => { createHandler?.(win); }
	};
}

beforeEach(() => {
	randomUUID.mockReset();
	appendCloseWindowStep.mockClear();
});

describe(`window.popups.ts`, () => {
	test(`assigns each newly created popup a unique id, injects it via executeJavaScript, and attaches its CDP debugger`, () => {
		randomUUID.mockReturnValueOnce(`popup-a`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popup = makeFakePopup();

		testWebContents._emitCreateWindow(popup);

		expect(popup.webContents.executeJavaScript).toHaveBeenCalledWith(expect.stringContaining(`popup-a`));
		expect(popup.webContents.debugger.attach).toHaveBeenCalled();
	});

	test(`tracks two simultaneously open popups independently, each resolvable by its own id via getPopupWebContents`, () => {
		randomUUID.mockReturnValueOnce(`popup-a`).mockReturnValueOnce(`popup-b`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popupA = makeFakePopup();
		const popupB = makeFakePopup();

		testWebContents._emitCreateWindow(popupA);
		testWebContents._emitCreateWindow(popupB);

		expect(getPopupWebContents(`popup-a` as PopupId)).toBe(popupA.webContents);
		expect(getPopupWebContents(`popup-b` as PopupId)).toBe(popupB.webContents);
	});

	test(`removes a popup from tracking, detaches its debugger, and appends a closeWindow step with that popup's id when it's closed during recording`, () => {
		randomUUID.mockReturnValueOnce(`popup-a`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popup = makeFakePopup();
		testWebContents._emitCreateWindow(popup);

		popup._emitClosed();

		expect(popup.webContents.debugger.detach).toHaveBeenCalled();
		expect(getPopupWebContents(`popup-a` as PopupId)).toBeNull();
		expect(appendCloseWindowStep).toHaveBeenCalledWith(`popup-a`);
	});

	test(`getPopupWebContents returns null for an id that was never tracked or has already closed`, () => {
		expect(getPopupWebContents(`never-tracked` as PopupId)).toBeNull();
	});

	test(`closePopup closes the exact matching popup by id and resolves once it's closed, leaving other open popups untouched`, async () => {
		randomUUID.mockReturnValueOnce(`popup-a`).mockReturnValueOnce(`popup-b`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popupA = makeFakePopup();
		const popupB = makeFakePopup();
		testWebContents._emitCreateWindow(popupA);
		testWebContents._emitCreateWindow(popupB);

		await closePopup(`popup-a` as PopupId);

		expect(popupA.close).toHaveBeenCalled();
		expect(popupB.close).not.toHaveBeenCalled();
		expect(getPopupWebContents(`popup-b` as PopupId)).toBe(popupB.webContents);
	});

	test(`closePopup resolves immediately when the given id isn't open`, async () => {
		await expect(closePopup(`missing` as PopupId)).resolves.toBeUndefined();
	});
});
