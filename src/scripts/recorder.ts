import { ipcRenderer } from 'electron';
import getUniqueSelector from '@cypress/unique-selector/lib/index.js';
import type { RecordingStep, SelectorGroup, CursorSelection } from '@registry/recording.js';
import type { FramePath, ScreenCoordinate, ElementClassList, SelectorString, DomElement, EventSourceNode, IsExcluded, IsPasswordInput, IsStableId, DomIdAttribute, SelectorTraitType, SelectorAttributeKey } from '@registry/primitives.js';

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

const STABLE_ID_PATTERN = /^[a-zA-Z_-]+$/;

function _isStableId(id: DomIdAttribute): IsStableId {
	return STABLE_ID_PATTERN.test(id);
}

function _getPositionalSelector(target: Element): SelectorString | null {
	return getUniqueSelector(target, { filter: (type: SelectorTraitType, key: SelectorAttributeKey, value: DomIdAttribute) => type !== `attribute` || key !== `id` || _isStableId(value) }) as SelectorString | null;
}

function _computeSelectorGroup(target: Element): SelectorGroup {
	const dataTestId = target.getAttribute(`data-testid`);
	const dataQa = target.getAttribute(`data-qa`);
	const ariaLabel = target.getAttribute(`aria-label`);
	const id = target.id;
	const usableId = id && _isStableId(id) ? id : null;

	let primary: SelectorString;
	if (dataTestId) { primary = `[data-testid="${dataTestId}"]`; }
	else if (dataQa) { primary = `[data-qa="${dataQa}"]`; }
	else if (ariaLabel) { primary = `[aria-label="${ariaLabel}"]`; }
	else if (usableId) { primary = `#${usableId}`; }
	else { primary = (_getPositionalSelector(target) || target.tagName.toLowerCase()) as SelectorString; }

	const fallbacks: ElementClassList = [];
	if (ariaLabel && primary !== `[aria-label="${ariaLabel}"]`) { fallbacks.push(`[aria-label="${ariaLabel}"]`); }
	if (usableId && primary !== `#${usableId}`) { fallbacks.push(`#${usableId}`); }
	if (target.classList.length > 0) { fallbacks.push(`.${Array.from(target.classList).join(`.`)}`); }
	const uniqueSelector = _getPositionalSelector(target);
	if (uniqueSelector) { fallbacks.push(uniqueSelector); }

	return { primary, fallbacks };
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

function _onClick(event: MouseEvent): void {
	const target = event.target as Element | null;
	if (!target) { return; }
	if (_isExcluded(target)) { return; }

	_push({
		type: `click`,
		selectors: _computeSelectorGroup(target),
		// viewport-relative (not element-relative) so CDP's Input.dispatchMouseEvent can replay it directly
		offsetX: event.clientX as ScreenCoordinate,
		offsetY: event.clientY as ScreenCoordinate,
		frame: _computeFramePath(),
		timestamp: Date.now()
	});
}

function _onChange(event: Event): void {
	const target = event.target as HTMLInputElement | null;
	if (!target) { return; }
	if (_isExcluded(target)) { return; }
	if (_isPasswordField(target)) { return; }

	_push({
		type: `change`,
		selectors: _computeSelectorGroup(target),
		value: target.value,
		frame: _computeFramePath(),
		timestamp: Date.now()
	});
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
document.addEventListener(`change`, _onChange, { capture: true });
document.addEventListener(`keydown`, _onKeyDown, { capture: true });
document.addEventListener(`keyup`, _onKeyUp, { capture: true });
document.addEventListener(`scroll`, _onScroll, { capture: true });

setInterval(_flush, FLUSH_INTERVAL_MS);
