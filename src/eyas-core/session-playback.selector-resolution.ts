import type { JsSnippet, VariableValue, AccessibleName, SelectorString, IsVisible } from '@registry/primitives.js';
import type { SelectorGroup, ClickPoint, KeyDownStep, ValueBearingElement, SelectableValueElement } from '@registry/recording.js';

// Every function below runs in the *renderer*, not here — building an executeJavaScript() payload
// out of real, typed, linted TypeScript functions (via Function.prototype.toString(), the same
// technique Playwright/Puppeteer use for page.evaluate(fn)) instead of hand-authored template-string
// JS. Each is written and type-checked as ordinary code against the DOM lib; _serialize() stitches
// the referenced functions together into one IIFE string at build time. Because these are read back
// via .toString(), they must stay self-contained closures — no references to anything outside this
// file's own top-level functions/constants (those don't exist in the renderer at runtime).

// stitches real functions into one IIFE string: `main`'s own dependencies (also real functions) are
// declared first so they're in scope when `main` runs, then `main` is invoked with the JSON-safe args
function _serialize(main: (...args: never[]) => unknown, dependencies: ((...args: never[]) => unknown)[], args: unknown[]): JsSnippet {
	const declarations = [...dependencies, main].map(fn => fn.toString()).join(`\n`);
	return `(function(){ ${declarations} return ${main.name}(${args.map(a => JSON.stringify(a)).join(`, `)}); })()`;
}

function _normalizeText(t: AccessibleName | null): AccessibleName {
	return (t || ``).replace(/\s+/g, ` `).trim();
}

// Mirrors the same documented W3C-accname subset used at capture time (src/scripts/recorder.ts
// _computeAccessibleName) so a candidate that matched uniquely during recording resolves to the same
// element during replay.
function _computeLabelledName(el: Element): AccessibleName | null {
	const labelledBy = el.getAttribute(`aria-labelledby`);
	if (labelledBy) {
		const text = labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent ?? ``).join(` `);
		if (_normalizeText(text)) { return _normalizeText(text); }
	}
	if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
		const forLabel = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
		const label = forLabel || el.closest(`label`);
		if (label) {
			const labelText = _normalizeText(label.textContent);
			if (labelText) { return labelText; }
		}
	}
	return null;
}

function _computeAccessibleName(el: Element): AccessibleName | null {
	const ariaLabel = el.getAttribute(`aria-label`);
	if (ariaLabel) { return _normalizeText(ariaLabel); }
	const labelled = _computeLabelledName(el);
	if (labelled) { return labelled; }
	const alt = el.getAttribute(`alt`);
	if (alt) { return _normalizeText(alt); }
	const title = el.getAttribute(`title`);
	if (title) { return _normalizeText(title); }
	const placeholder = el.getAttribute(`placeholder`);
	if (placeholder) { return _normalizeText(placeholder); }
	if (el.children.length === 0) {
		const text = _normalizeText(el.textContent);
		if (text) { return text; }
	}
	return null;
}

function _findByAria(name: AccessibleName): Element[] {
	const els = document.querySelectorAll(`*:not(label)`);
	for (let i = 0; i < els.length; i++) { if (_computeAccessibleName(els[i]) === name) { return [els[i]]; } }
	return [];
}

// document order surfaces ancestors (html/body/wrapper divs) before the leaf a user actually
// clicked, since an ancestor's textContent includes its matching descendant's — prefer the
// innermost match (no descendant also matches), same as Playwright's getByText semantics.
function _findByText(text: AccessibleName): Element[] {
	const els = document.querySelectorAll(`*`);
	const matches: Element[] = [];
	for (let i = 0; i < els.length; i++) { if (_normalizeText(els[i].textContent) === text) { matches.push(els[i]); } }
	for (let j = 0; j < matches.length; j++) {
		let hasMatchingDescendant = false;
		for (let k = 0; k < matches.length; k++) {
			if (k !== j && matches[j].contains(matches[k])) { hasMatchingDescendant = true; break; }
		}
		if (!hasMatchingDescendant) { return [matches[j]]; }
	}
	return matches.length ? [matches[0]] : [];
}

// aria/text candidates were only captured when they uniquely identified one element, so a single
// match is expected; the CSS/testid fallback candidates use querySelectorAll so a caller-supplied
// visibility check can pick among duplicate matches (e.g. responsive-breakpoint duplicates).
function _candidatesForSelector(candidate: SelectorString): Element[] {
	if (candidate.indexOf(`aria/`) === 0) { return _findByAria(candidate.slice(5)); }
	if (candidate.indexOf(`text/`) === 0) { return _findByText(candidate.slice(5)); }
	const cssSelector: SelectorString = candidate.indexOf(`testid/`) === 0
		? `[data-testid="${candidate.slice(7)}"], [data-qa="${candidate.slice(7)}"]`
		: candidate;
	try { return Array.prototype.slice.call(document.querySelectorAll(cssSelector)); } catch { return []; }
}

const _RESOLVER_DEPENDENCIES = [_normalizeText, _computeLabelledName, _computeAccessibleName, _findByAria, _findByText, _candidatesForSelector];

function _isVisible(el: Element): IsVisible {
	if ((el as HTMLElement).offsetParent === null && getComputedStyle(el).position !== `fixed`) { return false; }
	const rect = el.getBoundingClientRect();
	return rect.width > 0 && rect.height > 0;
}

// getBoundingClientRect() on an inline element that wraps across multiple lines (e.g. a link
// mid-sentence in a paragraph) returns a box spanning every line it touches — its center can land in
// the gap between lines, which belongs to the parent, not the element. getClientRects() gives one
// rect per line box instead; take the center of the first line whose own center point actually
// hit-tests back to this element (or a descendant), falling back to the bounding-box center only if
// no individual line rect passes that check.
function _clickPointOf(el: Element): ClickPoint {
	for (const rect of el.getClientRects()) {
		if (rect.width === 0 || rect.height === 0) { continue; }
		const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
		const hit = document.elementFromPoint(x, y);
		if (hit && (hit === el || el.contains(hit))) { return { x, y }; }
	}
	const b = el.getBoundingClientRect();
	return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
}

// step.offsetX/offsetY are viewport-relative at record time and can drift from replay-time layout,
// so we resolve the recorded selector to its actual on-page position instead. Tries every candidate
// in priority order (aria -> text -> testid -> CSS), and within a CSS/testid candidate's matches,
// walks all of them and takes the first one that's actually visible — some pages (e.g. GitHub's file
// browser) render duplicate matches for responsive breakpoints.
function _resolveClickPoint(candidates: SelectorGroup): ClickPoint | null {
	for (const candidate of candidates) {
		for (const el of _candidatesForSelector(candidate)) {
			// pages may set CSS scroll-behavior: smooth — force an instant jump so the rects read
			// immediately after reflect the post-scroll position
			el.scrollIntoView({ block: `center`, inline: `center`, behavior: `instant` });
			if (!_isVisible(el)) { continue; }
			return _clickPointOf(el);
		}
	}
	return null;
}

export function buildClickPointScript(candidates: SelectorGroup): JsSnippet {
	return _serialize(_resolveClickPoint, [..._RESOLVER_DEPENDENCIES, _isVisible, _clickPointOf], [candidates]);
}

// Same candidate-priority resolution as _resolveClickPoint, but for setting an input's value and
// dispatching input/change rather than clicking — see _dispatchChange in session-playback.service.ts
// for why .value is set directly instead of using CDP Input.insertText.
function _dispatchChange(candidates: SelectorGroup, value: VariableValue): void {
	for (const candidate of candidates) {
		const matches = _candidatesForSelector(candidate) as ValueBearingElement[];
		if (matches.length === 0) { continue; }
		const el = matches[0];
		if (el.value !== value) {
			el.value = value;
			el.dispatchEvent(new Event(`input`, { bubbles: true }));
		}
		el.dispatchEvent(new Event(`change`, { bubbles: true }));
		return;
	}
}

export function buildChangeScript(candidates: SelectorGroup, value: VariableValue): JsSnippet {
	return _serialize(_dispatchChange, _RESOLVER_DEPENDENCIES, [candidates, value]);
}

// Splices a single keystroke into document.activeElement's value at the recorded cursor position
// (rather than dispatching an inert CDP key event) — see _dispatchKeyDown in
// session-playback.service.ts for why per-keystroke replay is done this way instead of snapping to
// the final value on the `change` step.
function _mutateActiveElementValue(key: KeyDownStep[`key`], start: NonNullable<KeyDownStep[`selectionStart`]>, end: NonNullable<KeyDownStep[`selectionEnd`]>): void {
	const el = document.activeElement as SelectableValueElement | null;
	if (!el || typeof el.value !== `string`) { return; }
	const value = el.value;
	let newValue, newPos;
	if (key === `Backspace`) {
		newValue = start === end ? value.slice(0, Math.max(0, start - 1)) + value.slice(end) : value.slice(0, start) + value.slice(end);
		newPos = start === end ? Math.max(0, start - 1) : start;
	} else if (key === `Delete`) {
		newValue = start === end ? value.slice(0, start) + value.slice(end + 1) : value.slice(0, start) + value.slice(end);
		newPos = start;
	} else {
		newValue = value.slice(0, start) + key + value.slice(end);
		newPos = start + key.length;
	}
	el.value = newValue;
	try { el.setSelectionRange?.(newPos, newPos); } catch { /* not a text-selectable input type */ }
	el.dispatchEvent(new Event(`input`, { bubbles: true }));
}

export function buildKeyDownMutationScript(key: KeyDownStep[`key`], selectionStart: NonNullable<KeyDownStep[`selectionStart`]>, selectionEnd: NonNullable<KeyDownStep[`selectionEnd`]>): JsSnippet {
	return _serialize(_mutateActiveElementValue, [], [key, selectionStart, selectionEnd]);
}
