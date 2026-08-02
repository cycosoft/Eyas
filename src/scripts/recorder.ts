import { ipcRenderer } from 'electron';
import type { RecordingStep, CursorSelection, MouseButton } from '@registry/recording.js';
import type { FramePath, ScreenCoordinate, DomElement, EventSourceNode, IsExcluded, IsPasswordInput } from '@registry/primitives.js';
import { computeSelectorGroup } from './recorder.selectors.js';

const FLUSH_INTERVAL_MS = 2000;
const FLUSH_AT_STEP_COUNT = 50;
const SCROLL_THROTTLE_MS = 200;

// popupId is not tagged here — the main process tags it on arrival in ipc-handlers.recorder.ts,
// keyed off which webContents the flush IPC came from, since a popup's injected global doesn't
// reliably survive its first navigation

let _buffer: RecordingStep[] = [];
let _scrollThrottleTimer: ReturnType<typeof setTimeout> | null = null;

function _isExcluded(target: DomElement): IsExcluded {
	return !!target.closest(`[data-eyas-no-record]`);
}

function _isPasswordField(target: EventSourceNode): IsPasswordInput {
	return target instanceof HTMLInputElement && target.type === `password`;
}

function _computeFramePath(): FramePath | undefined {
	if (window === window.top) { return undefined; }

	const path: FramePath = [];
	let current: Window = window;

	try {
		while (current !== current.parent) {
			const parent = current.parent;
			const siblings = Array.prototype.slice.call(parent.frames);
			const index = siblings.indexOf(current);
			path.unshift(index === -1 ? 0 : index);
			current = parent;
		}
	} catch {
		// cross-origin frame access threw a SecurityException — stop walking and use what we have
	}

	return path;
}

function _push(step: RecordingStep): void {
	_buffer.push(step);
	if (_buffer.length >= FLUSH_AT_STEP_COUNT) { _flush(); }
}

function _flush(): void {
	if (_buffer.length === 0) { return; }
	ipcRenderer.send(`recorder-flush-steps`, _buffer);
	_buffer = [];
}

function _pushClick(event: MouseEvent, button?: MouseButton): void {
	const target = event.target as Element | null;
	if (!target) { return; }
	if (_isExcluded(target)) { return; }

	_push({
		type: `click`,
		// omitted for a left click so sessions stay byte-identical to pre-right-click recordings
		...(button ? { button } : {}),
		selectors: computeSelectorGroup(target),
		// viewport-relative (not element-relative) so CDP's Input.dispatchMouseEvent can replay it directly
		offsetX: event.clientX as ScreenCoordinate,
		offsetY: event.clientY as ScreenCoordinate,
		frame: _computeFramePath(),
		timestamp: Date.now()
	});
	// flush immediately rather than waiting for the interval — a click can trigger a same-tick
	// navigation that tears down this context (and the buffer) before the next timer fires
	_flush();
}

function _onClick(event: MouseEvent): void { _pushClick(event); }

// `contextmenu` rather than `mousedown`/`mouseup`: it's the event a page acts on, and it can't
// double-record (Blink dispatches no `click` for the right button), so no dedup against _onClick.
function _onContextMenu(event: MouseEvent): void { _pushClick(event, `secondary`); }

function _onChange(event: Event): void {
	const target = event.target as HTMLInputElement | null;
	if (!target) { return; }
	if (_isExcluded(target)) { return; }
	if (_isPasswordField(target)) { return; }

	_push({
		type: `change`,
		selectors: computeSelectorGroup(target),
		value: target.value,
		frame: _computeFramePath(),
		timestamp: Date.now()
	});
	// flush immediately for the same reason as _onClick — a change (e.g. a <select> whose
	// onchange redirects) can also trigger a same-tick navigation
	_flush();
}

/**
 * The editable root a node sits in, or null. `[contenteditable="false"]` is deliberately not
 * matched: an uneditable island inside an editor must resolve to the editor around it, not itself.
 */
function _editableRoot(target: Element | null): HTMLElement | null {
	if (!target) { return null; }
	const root = target.closest(`[contenteditable=""], [contenteditable="true"]`) as HTMLElement | null;
	return root?.isContentEditable ? root : null;
}

let _editableFocus: HTMLElement | null = null;
let _editableFocusText = ``;

function _onFocusIn(event: FocusEvent): void {
	_editableFocus = _editableRoot(event.target as Element | null);
	_editableFocusText = _editableFocus?.innerText ?? ``;
}

// A contenteditable root fires no `change` event, so the corrector replay needs is captured here
// instead — on leaving the editor, and only if its text actually moved while the user was in it.
function _pushEditableChange(root: HTMLElement): void {
	const text = root.innerText;
	_editableFocus = null;
	if (text === _editableFocusText) { return; }
	if (_isExcluded(root)) { return; }

	_push({
		type: `editableChange`,
		// the editor's own text can't identify it — that's the value this step exists to repair
		selectors: computeSelectorGroup(root, { ignoreOwnText: true }),
		text,
		frame: _computeFramePath(),
		timestamp: Date.now()
	});
	// flush immediately for the same reason as _onChange — leaving a field can trigger a same-tick
	// navigation that tears the buffer down
	_flush();
}

function _onFocusOut(event: FocusEvent): void {
	// a node detached before focusout reaches it (an editor that re-renders on blur) never bubbles
	// here at all — that edit is caught by the beforeunload sweep instead, or by the next focusin
	// replacing it. No fallback is possible from inside this listener.
	const root = _editableRoot(event.target as Element | null);
	if (!root || root !== _editableFocus) { return; }
	// focus moving *within* the same editor (an inner node, a toolbar button that hands focus back)
	// isn't the end of an edit — correcting mid-edit would fight the keystrokes still to come
	if (_editableRoot(event.relatedTarget as Element | null) === root) { return; }
	_pushEditableChange(root);
}

// navigating away while still inside an editor never fires focusout — capture the pending edit
// before the buffer goes out with the document
function _onBeforeUnload(): void {
	if (_editableFocus) { _pushEditableChange(_editableFocus); }
	_flush();
}

function _captureSelection(target: Element): CursorSelection {
	if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) { return {}; }
	try {
		return { selectionStart: target.selectionStart ?? undefined, selectionEnd: target.selectionEnd ?? undefined };
	} catch {
		// some input types (number, email, date, etc.) throw when reading selection — omit rather than fail recording
		return {};
	}
}

function _onKeyDown(event: KeyboardEvent): void {
	const target = event.target as Element | null;
	if (!target) { return; }
	if (_isExcluded(target)) { return; }
	if (_isPasswordField(target)) { return; }

	_push({ type: `keyDown`, key: event.key, ..._captureSelection(target), frame: _computeFramePath(), timestamp: Date.now() });
}

function _onKeyUp(event: KeyboardEvent): void {
	const target = event.target as Element | null;
	if (!target) { return; }
	if (_isExcluded(target)) { return; }
	if (_isPasswordField(target)) { return; }

	_push({ type: `keyUp`, key: event.key, frame: _computeFramePath(), timestamp: Date.now() });
}

function _onScroll(): void {
	if (_scrollThrottleTimer) { clearTimeout(_scrollThrottleTimer); }

	_scrollThrottleTimer = setTimeout(() => {
		_push({ type: `scroll`, x: window.scrollX as ScreenCoordinate, y: window.scrollY as ScreenCoordinate, frame: _computeFramePath(), timestamp: Date.now() });
	}, SCROLL_THROTTLE_MS);
}

document.addEventListener(`click`, _onClick, { capture: true });
document.addEventListener(`contextmenu`, _onContextMenu, { capture: true });
document.addEventListener(`change`, _onChange, { capture: true });
document.addEventListener(`keydown`, _onKeyDown, { capture: true });
document.addEventListener(`keyup`, _onKeyUp, { capture: true });
document.addEventListener(`scroll`, _onScroll, { capture: true });
document.addEventListener(`focusin`, _onFocusIn, { capture: true });
document.addEventListener(`focusout`, _onFocusOut, { capture: true });
// last-resort flush for anything still buffered (e.g. a pending throttled scroll) right
// before the document is torn down by navigation or tab close
window.addEventListener(`beforeunload`, _onBeforeUnload, { capture: true });

setInterval(_flush, FLUSH_INTERVAL_MS);
