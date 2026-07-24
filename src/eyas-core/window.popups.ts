import { randomUUID } from 'crypto';
import type { PopupId } from '@registry/primitives.js';
import sessionRecorderService from './session-recorder.service.js';

const CDP_DEBUGGER_VERSION = `1.3`;

const _openPopups = new Map<PopupId, Electron.BrowserWindow>();

function _waitForClosed(win: Electron.BrowserWindow): Promise<void> {
	return new Promise(resolve => win.once(`closed`, () => resolve()));
}

/** Hooks the test layer's webContents so popups it opens are tracked, tagged with a unique id, and their closure is captured as a recording step. */
export function registerPopupTracking(testWebContents: Electron.WebContents): void {
	testWebContents.on(`did-create-window`, win => {
		const popupId = randomUUID() as PopupId;
		_openPopups.set(popupId, win);

		// stamp the id before the user (or replay) can interact with the popup, so every
		// recorder-captured step inside it already knows which popup it belongs to
		win.webContents.executeJavaScript(`window.__eyasPopupId = ${JSON.stringify(popupId)}`).catch(() => {});

		try { win.webContents.debugger.attach(CDP_DEBUGGER_VERSION); } catch { /* already attached */ }

		win.on(`closed`, () => {
			_openPopups.delete(popupId);
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
