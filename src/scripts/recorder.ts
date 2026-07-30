import { ipcRenderer } from 'electron';
import getUniqueSelector from '@cypress/unique-selector/lib/index.js';
import type { RecordingStep, SelectorGroup, CursorSelection } from '@registry/recording.js';
import type { FramePath, ScreenCoordinate, ElementClassList, SelectorString, DomElement, EventSourceNode, IsExcluded, IsPasswordInput, IsStableId, DomIdAttribute, SelectorTraitType, SelectorAttributeKey, AccessibleName, IsUnique } from '@registry/primitives.js';

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

const TEXT_CANDIDATE_MAX_LENGTH = 80;

function _normalizeText(text: AccessibleName): AccessibleName {
	return text.replace(/\s+/g, ` `).trim();
}

function _computeLabelledName(target: Element): AccessibleName | null {
	const labelledBy = target.getAttribute(`aria-labelledby`);
	if (labelledBy) {
		const text = labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent || ``).join(` `);
		if (_normalizeText(text)) { return _normalizeText(text); }
	}

	if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
		const id = target.id;
		const forLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
		const label = forLabel || target.closest(`label`);
		if (label) {
			const text = _normalizeText(label.textContent || ``);
			if (text) { return text; }
		}
	}

	return null;
}

// Documented subset of W3C accname — not full accname computation (e.g. no recursive
// aria-labelledby chains, no CSS-generated-content text). Covers the common capture cases.
function _computeAccessibleName(target: Element): AccessibleName | null {
	const ariaLabel = target.getAttribute(`aria-label`);
	if (ariaLabel) { return _normalizeText(ariaLabel); }

	const labelledName = _computeLabelledName(target);
	if (labelledName) { return labelledName; }

	const alt = target.getAttribute(`alt`);
	if (alt) { return _normalizeText(alt); }

	const title = target.getAttribute(`title`);
	if (title) { return _normalizeText(title); }

	const placeholder = target.getAttribute(`placeholder`);
	if (placeholder) { return _normalizeText(placeholder); }

	// only treat textContent as the accessible name for leaf-ish elements — a container's
	// textContent is the concatenation of all its descendants' text, which would otherwise make
	// every ancestor (up to <body>) spuriously "share" a descendant's name
	if (target.children.length === 0) {
		const text = target.textContent || ``;
		if (_normalizeText(text)) { return _normalizeText(text); }
	}

	return null;
}

function _isUniqueAccessibleName(name: AccessibleName): IsUnique {
	let matches = 0;
	// exclude <label> — its own textContent fallback would otherwise collide with the accessible
	// name it *assigns* to its associated control, making an otherwise-unique name look duplicate
	for (const el of document.querySelectorAll(`*:not(label)`)) {
		if (_computeAccessibleName(el) === name) {
			matches++;
			if (matches > 1) { return false; }
		}
	}
	return matches === 1;
}

function _isUniqueByTagAndText(target: Element, text: AccessibleName): IsUnique {
	let matches = 0;
	for (const el of document.querySelectorAll(target.tagName)) {
		if (_normalizeText(el.textContent || ``) === text) {
			matches++;
			if (matches > 1) { return false; }
		}
	}
	return matches === 1;
}

// Priority order for capture: aria name -> visible text -> data-testid/data-qa -> CSS. This
// matches what Testing Library / Playwright / Cypress converge on (role/text first, test-id as
// escape hatch, CSS path only when nothing else is available) and is the vocabulary a candidate
// selector must use to be exportable to real e2e frameworks (see recording.ts SelectorCandidate).
function _computeSelectorGroup(target: Element): SelectorGroup {
	const candidates: ElementClassList = [];

	const accessibleName = _computeAccessibleName(target);
	if (accessibleName && _isUniqueAccessibleName(accessibleName)) { candidates.push(`aria/${accessibleName}`); }

	const text = _normalizeText(target.textContent || ``);
	if (text && text.length <= TEXT_CANDIDATE_MAX_LENGTH && _isUniqueByTagAndText(target, text)) { candidates.push(`text/${text}`); }

	const dataTestId = target.getAttribute(`data-testid`);
	const dataQa = target.getAttribute(`data-qa`);
	if (dataTestId) { candidates.push(`testid/${dataTestId}`); }
	else if (dataQa) { candidates.push(`testid/${dataQa}`); }

	const id = target.id;
	const usableId = id && _isStableId(id) ? id : null;
	if (usableId) { candidates.push(`#${usableId}`); }

	const uniqueSelector = _getPositionalSelector(target);
	if (uniqueSelector) { candidates.push(uniqueSelector); }

	if (candidates.length === 0) { candidates.push(target.tagName.toLowerCase() as SelectorString); }

	return candidates;
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
	// flush immediately rather than waiting for the interval — a click can trigger a same-tick
	// navigation that tears down this context (and the buffer) before the next timer fires
	_flush();
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
	// flush immediately for the same reason as _onClick — a change (e.g. a <select> whose
	// onchange redirects) can also trigger a same-tick navigation
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
document.addEventListener(`change`, _onChange, { capture: true });
document.addEventListener(`keydown`, _onKeyDown, { capture: true });
document.addEventListener(`keyup`, _onKeyUp, { capture: true });
document.addEventListener(`scroll`, _onScroll, { capture: true });
// last-resort flush for anything still buffered (e.g. a pending throttled scroll) right
// before the document is torn down by navigation or tab close
window.addEventListener(`beforeunload`, _flush, { capture: true });

setInterval(_flush, FLUSH_INTERVAL_MS);
