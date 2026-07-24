import { randomUUID } from 'crypto';
import type { PopupId, WebContentsId } from '@registry/primitives.js';
import sessionRecorderService from './session-recorder.service.js';

const CDP_DEBUGGER_VERSION = `1.3`;

const _openPopups = new Map<PopupId, Electron.BrowserWindow>();

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

		// `closed` fires after the window (and its webContents) is already destroyed, so
		// win.webContents must never be touched here — use the id captured above instead, and
		// keep debugger.detach() guarded since it also touches the destroyed webContents
		win.on(`closed`, () => {
			_openPopups.delete(popupId);
			_popupIdByWebContentsId.delete(webContentsId);
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
