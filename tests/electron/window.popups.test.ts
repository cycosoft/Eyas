import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { PopupId } from '@registry/primitives.js';

const { randomUUID, appendCloseWindowStep, isReplaying } = vi.hoisted(() => ({
	randomUUID: vi.fn(),
	appendCloseWindowStep: vi.fn(),
	isReplaying: vi.fn().mockReturnValue(false)
}));

vi.mock(`crypto`, () => ({ randomUUID }));

vi.mock(`@core/session-recorder.service.js`, () => ({
	default: { appendCloseWindowStep, isReplaying }
}));

type FakeLayerBounds = { x: number; y: number; width: number; height: number };
type FakeLayerWebContents = { loadURL: MockFn; isDestroyed: MockFn };
type FakeRecordingLayer = {
	setBackgroundColor: MockFn;
	setBounds: MockFn;
	getBounds: () => FakeLayerBounds;
	webContents: FakeLayerWebContents;
}

const { MockWebContentsView, recordingLayerInstances } = vi.hoisted(() => {
	function makeFakeLayer(): FakeRecordingLayer {
		let bounds: FakeLayerBounds = { x: 0, y: 0, width: 0, height: 0 };
		return {
			setBackgroundColor: vi.fn(),
			setBounds: vi.fn((next: FakeLayerBounds) => { bounds = next; }),
			getBounds: vi.fn(() => bounds),
			webContents: { loadURL: vi.fn(), isDestroyed: vi.fn().mockReturnValue(false) }
		};
	}

	const instances: FakeRecordingLayer[] = [];
	function FakeWebContentsView(): FakeRecordingLayer {
		const layer = makeFakeLayer();
		instances.push(layer);
		return layer;
	}

	return { MockWebContentsView: FakeWebContentsView, recordingLayerInstances: instances };
});

vi.mock(`electron`, () => ({ WebContentsView: MockWebContentsView }));

import { registerPopupTracking, getPopupWebContents, getPopupIdForWebContents, closePopup, closeAllPopups, setReplayPopupIdQueue, clearReplayPopupIdQueue, showRecordingOverlay, hideRecordingOverlay, hideAllRecordingOverlays, showAllRecordingOverlays } from '@core/window.popups.js';

type MockFn = ReturnType<typeof vi.fn>;
type MockEventName = string;
type ClosedListener = () => void;

type FakePopupDebugger = {
	attach: MockFn;
	detach: MockFn;
}

let _nextWebContentsId = 1;

type FakePopupWebContents = {
	id: number;
	debugger: FakePopupDebugger;
	on: MockFn;
}

type FakeContentView = {
	addChildView: MockFn;
}

type FakePopup = {
	webContents: FakePopupWebContents;
	isDestroyed: MockFn;
	close: MockFn;
	on: MockFn;
	once: MockFn;
	contentView: FakeContentView;
	getContentSize: MockFn;
	_emitClosed: ClosedListener;
	_emitResize: () => void;
}

type FakeTestWebContents = {
	on: MockFn;
	_emitCreateWindow: (win: FakePopup) => void;
}

function makeFakePopup(): FakePopup {
	const closedHandlers: ClosedListener[] = [];
	const resizeHandlers: ClosedListener[] = [];
	const registerListener = (event: MockEventName, cb: ClosedListener): void => {
		if (event === `closed`) { closedHandlers.push(cb); }
		if (event === `resize`) { resizeHandlers.push(cb); }
	};

	const popup: FakePopup = {
		webContents: {
			id: _nextWebContentsId++,
			debugger: { attach: vi.fn(), detach: vi.fn() },
			on: vi.fn()
		},
		isDestroyed: vi.fn().mockReturnValue(false),
		close: vi.fn(() => popup._emitClosed()),
		on: vi.fn(registerListener),
		once: vi.fn(registerListener),
		contentView: { addChildView: vi.fn() },
		getContentSize: vi.fn().mockReturnValue([800, 600]),
		_emitClosed: () => closedHandlers.forEach(cb => cb()),
		_emitResize: () => resizeHandlers.forEach(cb => cb())
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
	isReplaying.mockReset().mockReturnValue(false);
	recordingLayerInstances.length = 0;
});

describe(`window.popups.ts`, () => {
	test(`assigns each newly created popup a unique id, resolvable via getPopupIdForWebContents, and attaches its CDP debugger`, () => {
		randomUUID.mockReturnValueOnce(`popup-a`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popup = makeFakePopup();

		testWebContents._emitCreateWindow(popup);

		expect(getPopupIdForWebContents(popup.webContents as never)).toBe(`popup-a`);
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

	test(`still appends the closeWindow step when the popup's webContents.id getter throws, as it does on a real destroyed BrowserWindow`, () => {
		randomUUID.mockReturnValueOnce(`popup-a`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popup = makeFakePopup();
		testWebContents._emitCreateWindow(popup);
		Object.defineProperty(popup.webContents, `id`, {
			get(): never { throw new Error(`Object has been destroyed`); }
		});

		popup._emitClosed();

		expect(appendCloseWindowStep).toHaveBeenCalledWith(`popup-a`);
	});

	test(`getPopupIdForWebContents returns undefined for a webContents that isn't a tracked popup (e.g. the main test layer)`, () => {
		expect(getPopupIdForWebContents({ id: 9999 } as never)).toBeUndefined();
	});

	test(`stops resolving a popup's webContents to its id once the popup has closed`, () => {
		randomUUID.mockReturnValueOnce(`popup-a`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popup = makeFakePopup();
		testWebContents._emitCreateWindow(popup);

		popup._emitClosed();

		expect(getPopupIdForWebContents(popup.webContents as never)).toBeUndefined();
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

	test(`closeAllPopups closes every currently-tracked popup`, async () => {
		randomUUID.mockReturnValueOnce(`popup-a`).mockReturnValueOnce(`popup-b`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popupA = makeFakePopup();
		const popupB = makeFakePopup();
		testWebContents._emitCreateWindow(popupA);
		testWebContents._emitCreateWindow(popupB);

		await closeAllPopups();

		expect(popupA.close).toHaveBeenCalled();
		expect(popupB.close).toHaveBeenCalled();
	});

	test(`closeAllPopups resolves immediately when no popups are tracked`, async () => {
		await expect(closeAllPopups()).resolves.toBeUndefined();
	});

	test(`assigns queued replay ids, in order, to newly created popups instead of a fresh randomUUID, so a popup re-opened during replay keeps the id it was recorded with`, () => {
		randomUUID.mockReturnValue(`should-not-be-used`);
		setReplayPopupIdQueue([`popup-a` as PopupId, `popup-b` as PopupId]);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popupOne = makeFakePopup();
		const popupTwo = makeFakePopup();

		testWebContents._emitCreateWindow(popupOne);
		testWebContents._emitCreateWindow(popupTwo);

		expect(getPopupWebContents(`popup-a` as PopupId)).toBe(popupOne.webContents);
		expect(getPopupWebContents(`popup-b` as PopupId)).toBe(popupTwo.webContents);
		clearReplayPopupIdQueue();
	});

	test(`falls back to a fresh randomUUID once the replay id queue is exhausted or cleared`, () => {
		setReplayPopupIdQueue([`popup-a` as PopupId]);
		clearReplayPopupIdQueue();
		randomUUID.mockReturnValueOnce(`popup-fresh`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popup = makeFakePopup();

		testWebContents._emitCreateWindow(popup);

		expect(getPopupWebContents(`popup-fresh` as PopupId)).toBe(popup.webContents);
	});

	test(`creates a recording-layer overlay for every newly created popup, attached to the popup and collapsed by default`, () => {
		randomUUID.mockReturnValueOnce(`popup-a`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popup = makeFakePopup();

		testWebContents._emitCreateWindow(popup);

		expect(popup.contentView.addChildView).toHaveBeenCalledWith(recordingLayerInstances[0]);
		expect(recordingLayerInstances[0].webContents.loadURL).toHaveBeenCalled();
		expect(recordingLayerInstances[0].getBounds()).toEqual({ x: 0, y: 0, width: 800, height: 0 });
	});

	test(`shows the recording-layer overlay immediately when a popup is created mid-replay`, () => {
		isReplaying.mockReturnValue(true);
		randomUUID.mockReturnValueOnce(`popup-a`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popup = makeFakePopup();

		testWebContents._emitCreateWindow(popup);

		expect(recordingLayerInstances[0].getBounds()).toEqual({ x: 0, y: 0, width: 800, height: 600 });
	});

	test(`showRecordingOverlay expands a popup's recording layer to the popup's full content size`, () => {
		randomUUID.mockReturnValueOnce(`popup-a`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popup = makeFakePopup();
		testWebContents._emitCreateWindow(popup);

		showRecordingOverlay(`popup-a` as PopupId);

		expect(recordingLayerInstances[0].getBounds()).toEqual({ x: 0, y: 0, width: 800, height: 600 });
	});

	test(`hideRecordingOverlay collapses a popup's recording layer back to zero height`, () => {
		randomUUID.mockReturnValueOnce(`popup-a`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popup = makeFakePopup();
		testWebContents._emitCreateWindow(popup);
		showRecordingOverlay(`popup-a` as PopupId);

		hideRecordingOverlay(`popup-a` as PopupId);

		expect(recordingLayerInstances[0].getBounds()).toEqual({ x: 0, y: 0, width: 800, height: 0 });
	});

	test(`showAllRecordingOverlays expands every tracked popup's recording layer, e.g. a popup left open from a previous replay`, () => {
		randomUUID.mockReturnValueOnce(`popup-a`).mockReturnValueOnce(`popup-b`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popupA = makeFakePopup();
		const popupB = makeFakePopup();
		testWebContents._emitCreateWindow(popupA);
		testWebContents._emitCreateWindow(popupB);

		showAllRecordingOverlays();

		expect(recordingLayerInstances[0].getBounds()).toEqual({ x: 0, y: 0, width: 800, height: 600 });
		expect(recordingLayerInstances[1].getBounds()).toEqual({ x: 0, y: 0, width: 800, height: 600 });
	});

	test(`hideAllRecordingOverlays collapses every tracked popup's recording layer`, () => {
		randomUUID.mockReturnValueOnce(`popup-a`).mockReturnValueOnce(`popup-b`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popupA = makeFakePopup();
		const popupB = makeFakePopup();
		testWebContents._emitCreateWindow(popupA);
		testWebContents._emitCreateWindow(popupB);
		showRecordingOverlay(`popup-a` as PopupId);
		showRecordingOverlay(`popup-b` as PopupId);

		hideAllRecordingOverlays();

		expect(recordingLayerInstances[0].getBounds().height).toBe(0);
		expect(recordingLayerInstances[1].getBounds().height).toBe(0);
	});

	test(`keeps a shown recording layer's width in sync when the popup is resized, without collapsing it`, () => {
		randomUUID.mockReturnValueOnce(`popup-a`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popup = makeFakePopup();
		testWebContents._emitCreateWindow(popup);
		showRecordingOverlay(`popup-a` as PopupId);
		popup.getContentSize.mockReturnValue([1000, 700]);

		popup._emitResize();

		expect(recordingLayerInstances[0].getBounds()).toEqual({ x: 0, y: 0, width: 1000, height: 700 });
	});

	test(`a resize on a collapsed (not currently shown) recording layer stays collapsed`, () => {
		randomUUID.mockReturnValueOnce(`popup-a`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popup = makeFakePopup();
		testWebContents._emitCreateWindow(popup);
		popup.getContentSize.mockReturnValue([1000, 700]);

		popup._emitResize();

		expect(recordingLayerInstances[0].getBounds()).toEqual({ x: 0, y: 0, width: 1000, height: 0 });
	});

	test(`no longer resizes or shows a popup's recording layer once the popup has closed`, () => {
		randomUUID.mockReturnValueOnce(`popup-a`);
		const testWebContents = makeTestWebContents();
		registerPopupTracking(testWebContents as never);
		const popup = makeFakePopup();
		testWebContents._emitCreateWindow(popup);
		popup._emitClosed();

		expect(() => showRecordingOverlay(`popup-a` as PopupId)).not.toThrow();
		expect(recordingLayerInstances[0].setBounds).toHaveBeenCalledTimes(1);
	});
});
