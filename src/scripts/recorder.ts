import type { RecordingStep, CursorSelection, MouseButton, KeyModifiers } from '@registry/recording.js';
import type { ScreenCoordinate, EventSourceNode, IsPasswordInput } from '@registry/primitives.js';
import { computeSelectorGroup } from './recorder.selectors.js';
import { pushStep, flushSteps, isExcluded, computeFramePath, FLUSH_INTERVAL_MS } from './recorder.buffer.js';
import { onFocusIn, onFocusOut, onInput, pushKeyDown, isSuppressedKeyUp, flushPendingEditableChange } from './recorder.editable.js';

// The recorder preload's event listeners. The step buffer lives in recorder.buffer.ts, selector
// capture in recorder.selectors.ts, and everything specific to a contenteditable root — which shares
// none of the `.value`/`change`/cursor machinery an <input> gets — in recorder.editable.ts.

const SCROLL_THROTTLE_MS = 200;

let _scrollThrottleTimer: ReturnType<typeof setTimeout> | null = null;

function _isPasswordField(target: EventSourceNode): IsPasswordInput {
	return target instanceof HTMLInputElement && target.type === `password`;
}

function _pushClick(event: MouseEvent, button?: MouseButton): void {
	const target = event.target as Element | null;
	if (!target) { return; }
	if (isExcluded(target)) { return; }

	pushStep({
		type: `click`,
		// omitted for a left click so sessions stay byte-identical to pre-right-click recordings
		...(button ? { button } : {}),
		selectors: computeSelectorGroup(target),
		// viewport-relative (not element-relative) so CDP's Input.dispatchMouseEvent can replay it directly
		offsetX: event.clientX as ScreenCoordinate,
		offsetY: event.clientY as ScreenCoordinate,
		frame: computeFramePath(),
		timestamp: Date.now()
	});
	// flush immediately rather than waiting for the interval — a click can trigger a same-tick
	// navigation that tears down this context (and the buffer) before the next timer fires
	flushSteps();
}

function _onClick(event: MouseEvent): void { _pushClick(event); }

// `contextmenu` rather than `mousedown`/`mouseup`: it's the event a page acts on, and it can't
// double-record (Blink dispatches no `click` for the right button), so no dedup against _onClick.
function _onContextMenu(event: MouseEvent): void { _pushClick(event, `secondary`); }

function _onChange(event: Event): void {
	const target = event.target as HTMLInputElement | null;
	if (!target) { return; }
	if (isExcluded(target)) { return; }
	if (_isPasswordField(target)) { return; }

	pushStep({
		type: `change`,
		selectors: computeSelectorGroup(target),
		value: target.value,
		frame: computeFramePath(),
		timestamp: Date.now()
	});
	// flush immediately for the same reason as _onClick — a change (e.g. a <select> whose
	// onchange redirects) can also trigger a same-tick navigation
	flushSteps();
}

// Only the flags actually held are written, so an ordinary keystroke's step stays exactly what it
// was before modifiers were captured — and `modifiers` being absent entirely is what tells replay
// to fall back to inferring them for sessions recorded before this existed.
function _captureModifiers(event: KeyboardEvent): KeyModifiers | undefined {
	const modifiers: KeyModifiers = {};
	if (event.altKey) { modifiers.alt = true; }
	if (event.ctrlKey) { modifiers.ctrl = true; }
	if (event.metaKey) { modifiers.meta = true; }
	if (event.shiftKey) { modifiers.shift = true; }
	return Object.keys(modifiers).length > 0 ? modifiers : undefined;
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
	if (isExcluded(target)) { return; }
	if (_isPasswordField(target)) { return; }

	const step: RecordingStep = { type: `keyDown`, key: event.key, modifiers: _captureModifiers(event), ..._captureSelection(target), frame: computeFramePath(), timestamp: Date.now() };
	// a printable key inside an editor may be superseded by the `input` event it produces — that's
	// decided there, not here, so the step is committed with the possibility of retraction
	pushKeyDown(step, event, target);
}

function _onKeyUp(event: KeyboardEvent): void {
	const target = event.target as Element | null;
	if (!target) { return; }
	if (isExcluded(target)) { return; }
	if (_isPasswordField(target)) { return; }
	if (isSuppressedKeyUp(event.key)) { return; }

	pushStep({ type: `keyUp`, key: event.key, modifiers: _captureModifiers(event), frame: computeFramePath(), timestamp: Date.now() });
}

function _onScroll(): void {
	if (_scrollThrottleTimer) { clearTimeout(_scrollThrottleTimer); }

	_scrollThrottleTimer = setTimeout(() => {
		pushStep({ type: `scroll`, x: window.scrollX as ScreenCoordinate, y: window.scrollY as ScreenCoordinate, frame: computeFramePath(), timestamp: Date.now() });
	}, SCROLL_THROTTLE_MS);
}

// last-resort flush for anything still buffered (e.g. a pending throttled scroll, or an edit in an
// editor that never lost focus) right before the document is torn down by navigation or tab close
function _onBeforeUnload(): void {
	flushPendingEditableChange();
	flushSteps();
}

document.addEventListener(`click`, _onClick, { capture: true });
document.addEventListener(`contextmenu`, _onContextMenu, { capture: true });
document.addEventListener(`change`, _onChange, { capture: true });
document.addEventListener(`input`, onInput, { capture: true });
document.addEventListener(`keydown`, _onKeyDown, { capture: true });
document.addEventListener(`keyup`, _onKeyUp, { capture: true });
document.addEventListener(`scroll`, _onScroll, { capture: true });
document.addEventListener(`focusin`, onFocusIn, { capture: true });
document.addEventListener(`focusout`, onFocusOut, { capture: true });
window.addEventListener(`beforeunload`, _onBeforeUnload, { capture: true });

setInterval(flushSteps, FLUSH_INTERVAL_MS);
