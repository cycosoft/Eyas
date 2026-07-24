import { ipcRenderer } from 'electron';
import getUniqueSelector from '@cypress/unique-selector/lib/index.js';
import type { RecordingStep, SelectorGroup, EyasPopupWindow } from '@registry/recording.js';
import type { FramePath, ScreenCoordinate, ElementClassList, SelectorString, DomElement, EventSourceNode, IsExcluded, IsPasswordInput } from '@registry/primitives.js';

const FLUSH_INTERVAL_MS = 2000;
const FLUSH_AT_STEP_COUNT = 50;
const SCROLL_THROTTLE_MS = 200;

// set by window.popups.ts via executeJavaScript before a popup can be interacted with;
// undefined in the main test layer, where nothing ever sets it
const _popupId = (window as unknown as EyasPopupWindow).__eyasPopupId;

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

function _computeSelectorGroup(target: Element): SelectorGroup {
	const dataTestId = target.getAttribute(`data-testid`);
	const dataQa = target.getAttribute(`data-qa`);
	const ariaLabel = target.getAttribute(`aria-label`);
	const id = target.id;

	let primary: SelectorString;
	if (dataTestId) { primary = `[data-testid="${dataTestId}"]`; }
	else if (dataQa) { primary = `[data-qa="${dataQa}"]`; }
	else if (ariaLabel) { primary = `[aria-label="${ariaLabel}"]`; }
	else if (id) { primary = `#${id}`; }
	else { primary = (getUniqueSelector(target) || target.tagName.toLowerCase()) as SelectorString; }

	const fallbacks: ElementClassList = [];
	if (ariaLabel && primary !== `[aria-label="${ariaLabel}"]`) { fallbacks.push(`[aria-label="${ariaLabel}"]`); }
	if (id && primary !== `#${id}`) { fallbacks.push(`#${id}`); }
	if (target.classList.length > 0) { fallbacks.push(`.${Array.from(target.classList).join(`.`)}`); }
	const uniqueSelector = getUniqueSelector(target);
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
		popupId: _popupId,
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
		popupId: _popupId,
		timestamp: Date.now()
	});
}

function _onKeyDown(event: KeyboardEvent): void {
	const target = event.target as Element | null;
	if (!target) { return; }
	if (_isExcluded(target)) { return; }
	if (_isPasswordField(target)) { return; }

	_push({ type: `keyDown`, key: event.key, frame: _computeFramePath(), popupId: _popupId, timestamp: Date.now() });
}

function _onKeyUp(event: KeyboardEvent): void {
	const target = event.target as Element | null;
	if (!target) { return; }
	if (_isExcluded(target)) { return; }
	if (_isPasswordField(target)) { return; }

	_push({ type: `keyUp`, key: event.key, frame: _computeFramePath(), popupId: _popupId, timestamp: Date.now() });
}

function _onScroll(): void {
	if (_scrollThrottleTimer) { clearTimeout(_scrollThrottleTimer); }

	_scrollThrottleTimer = setTimeout(() => {
		_push({ type: `scroll`, x: window.scrollX as ScreenCoordinate, y: window.scrollY as ScreenCoordinate, frame: _computeFramePath(), popupId: _popupId, timestamp: Date.now() });
	}, SCROLL_THROTTLE_MS);
}

document.addEventListener(`click`, _onClick, { capture: true });
document.addEventListener(`change`, _onChange, { capture: true });
document.addEventListener(`keydown`, _onKeyDown, { capture: true });
document.addEventListener(`keyup`, _onKeyUp, { capture: true });
document.addEventListener(`scroll`, _onScroll, { capture: true });

setInterval(_flush, FLUSH_INTERVAL_MS);
