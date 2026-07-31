import { randomUUID } from 'crypto';
import { WebContentsView } from 'electron';
import type { PopupId, WebContentsId, EyasProtocolUrl } from '@registry/primitives.js';
import sessionRecorderService from './session-recorder.service.js';
import { EYAS_UI_PARTITION } from '@scripts/constants.js';

const CDP_DEBUGGER_VERSION = `1.3`;

const _openPopups = new Map<PopupId, Electron.BrowserWindow>();

// per-popup glow overlay used to visually block user interaction during replay — a scoped-down
// sibling of $eyasLayer (no header/menus/IPC surface, see recording-layer.html), tracked here
// rather than on CoreContext since it's per-popup, not a single window-level field
const _recordingLayers = new Map<PopupId, Electron.WebContentsView>();

// reverse index keyed by webContents.id — lets the flush IPC handler tag each incoming step with
// its popupId based on which webContents actually sent it, rather than relying on a renderer-side
// injected global (window.__eyasPopupId), which proved unreliable: a popup's initial JS context
// (and the executeJavaScript stamp targeting it) doesn't reliably survive its first navigation
const _popupIdByWebContentsId = new Map<WebContentsId, PopupId>();

// during replay, popups must be re-assigned the exact ids they were recorded with (not fresh
// randomUUIDs) so that later steps — especially closeWindow — resolve against the right popup;
// this queue holds the recording's popupIds in first-appearance order, consumed one per popup
let _replayIdQueue: PopupId[] | null = null;

function _waitForClosed(win: Electron.BrowserWindow): Promise<void> {
	return new Promise(resolve => win.once(`closed`, () => resolve()));
}

function _recordingLayerUrl(): EyasProtocolUrl {
	const isDev = process.argv.includes(`--dev`);
	return (isDev && process.env[`ELECTRON_RENDERER_URL`])
		? `${process.env[`ELECTRON_RENDERER_URL`]}/recording-layer.html`
		: `ui://eyas.interface/recording-layer.html`;
}

/** Creates the popup's recording-layer overlay (collapsed by default) and attaches it to the popup window. */
function _createRecordingLayer(popupId: PopupId, win: Electron.BrowserWindow): void {
	const layer = new WebContentsView({ webPreferences: { partition: EYAS_UI_PARTITION } });
	_recordingLayers.set(popupId, layer);
	win.contentView.addChildView(layer);
	layer.setBackgroundColor(`#00000000`);

	const [width] = win.getContentSize();
	layer.setBounds({ x: 0, y: 0, width, height: 0 });

	layer.webContents.loadURL(_recordingLayerUrl());

	win.on(`resize`, () => {
		if (win.isDestroyed() || layer.webContents.isDestroyed()) { return; }
		const [newWidth, newHeight] = win.getContentSize();
		const isActive = layer.getBounds().height > 0;
		layer.setBounds({ x: 0, y: 0, width: newWidth, height: isActive ? newHeight : 0 });
	});

	if (sessionRecorderService.isReplaying()) {
		showRecordingOverlay(popupId);
	}
}

/** Expands a popup's recording-layer overlay to cover its full content area, blocking user input. */
export function showRecordingOverlay(popupId: PopupId): void {
	const layer = _recordingLayers.get(popupId);
	const win = _openPopups.get(popupId);
	if (!layer || !win || win.isDestroyed() || layer.webContents.isDestroyed()) { return; }

	const [width, height] = win.getContentSize();
	layer.setBounds({ x: 0, y: 0, width, height });
}

/** Collapses a popup's recording-layer overlay so it no longer blocks user input. */
export function hideRecordingOverlay(popupId: PopupId): void {
	const layer = _recordingLayers.get(popupId);
	if (!layer || layer.webContents.isDestroyed()) { return; }

	const { width } = layer.getBounds();
	layer.setBounds({ x: 0, y: 0, width, height: 0 });
}

/** Collapses every currently-tracked popup's recording-layer overlay — called when a replay ends. */
export function hideAllRecordingOverlays(): void {
	for (const popupId of _recordingLayers.keys()) { hideRecordingOverlay(popupId); }
}

/** Expands every currently-tracked popup's recording-layer overlay — called when a replay starts, so a popup left open from a previous replay (or opened manually during recording) is also blocked. */
export function showAllRecordingOverlays(): void {
	for (const popupId of _recordingLayers.keys()) { showRecordingOverlay(popupId); }
}

/** Switches popup id assignment into replay mode: the next N popups created will be assigned these ids, in order, instead of fresh randomUUIDs. */
export function setReplayPopupIdQueue(orderedPopupIds: PopupId[]): void {
	_replayIdQueue = [...orderedPopupIds];
}

/** Restores normal (randomUUID-based) popup id assignment after replay finishes. */
export function clearReplayPopupIdQueue(): void {
	_replayIdQueue = null;
}

/** Resolves the popupId of the popup that owns the given webContents, or undefined if it's not a tracked popup (e.g. the main test layer). */
export function getPopupIdForWebContents(webContents: Electron.WebContents): PopupId | undefined {
	return _popupIdByWebContentsId.get(webContents.id);
}

export function registerPopupTracking(testWebContents: Electron.WebContents): void {
	testWebContents.on(`did-create-window`, win => {
		const popupId = (_replayIdQueue?.length ? _replayIdQueue.shift() : undefined) ?? randomUUID() as PopupId;
		const webContentsId = win.webContents.id;
		_openPopups.set(popupId, win);
		_popupIdByWebContentsId.set(webContentsId, popupId);

		try { win.webContents.debugger.attach(CDP_DEBUGGER_VERSION); } catch { /* already attached */ }

		_createRecordingLayer(popupId, win);

		// `closed` fires after the window (and its webContents) is already destroyed, so
		// win.webContents must never be touched here — use the id captured above instead, and
		// keep debugger.detach() guarded since it also touches the destroyed webContents
		win.on(`closed`, () => {
			_openPopups.delete(popupId);
			_popupIdByWebContentsId.delete(webContentsId);
			_recordingLayers.delete(popupId);
			try { win.webContents.debugger.detach(); } catch { /* already detached / destroyed */ }
			sessionRecorderService.appendCloseWindowStep(popupId);
		});
	});
}

/** Looks up a tracked popup's webContents by id, for routing replay dispatch. */
export function getPopupWebContents(popupId: PopupId): Electron.WebContents | null {
	return _openPopups.get(popupId)?.webContents ?? null;
}

/** Closes the exact popup matching the given id, resolving once it's actually closed (or immediately if it isn't tracked). */
export async function closePopup(popupId: PopupId): Promise<void> {
	const win = _openPopups.get(popupId);
	if (!win || win.isDestroyed()) { return; }

	const closed = _waitForClosed(win);
	win.close();
	await closed;
}

/** Closes every currently-tracked popup — a replay-teardown guarantee so a step throwing mid-replay can't strand an open popup window. */
export async function closeAllPopups(): Promise<void> {
	await Promise.all([..._openPopups.keys()].map(popupId => closePopup(popupId)));
}
