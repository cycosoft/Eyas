import getUniqueSelector from '@cypress/unique-selector/lib/index.js';
import type { SelectorGroup, SelectorCaptureOptions } from '@registry/recording.js';
import type { ElementClassList, SelectorString, IsStableId, DomIdAttribute, SelectorTraitType, SelectorAttributeKey, AccessibleName, IsUnique } from '@registry/primitives.js';
import { computeScopedSelector } from './recorder.selector-scoping.js';

// Selector-candidate capture, split out of recorder.ts for max-lines. Runs in the recorder preload
// against the page under test; recorder.ts owns the event listeners that call in here.

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
function _computeAccessibleName(target: Element, ignoreOwnText?: SelectorCaptureOptions[`ignoreOwnText`]): AccessibleName | null {
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
	// ...and not at all when the caller is capturing an element whose text is the thing being
	// recorded (see SelectorCaptureOptions.ignoreOwnText)
	if (!ignoreOwnText && target.children.length === 0) {
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

// aria/text candidates that aren't globally unique fall back to an ancestor-scoped version (see
// recorder.selector-scoping.ts) rather than being dropped outright — only if no ancestor ever
// disambiguates does the caller move on to testid/href/id/positional candidates.
function _accessibleNameCandidate(target: Element, name: AccessibleName): SelectorString | null {
	if (_isUniqueAccessibleName(name)) { return `aria/${name}`; }
	return computeScopedSelector(target, el => _computeAccessibleName(el) === name, `scoped-aria`, name);
}

function _textCandidate(target: Element, text: AccessibleName): SelectorString | null {
	if (_isUniqueByTagAndText(target, text)) { return `text/${text}`; }
	return computeScopedSelector(target, el => _normalizeText(el.textContent || ``) === text, `scoped-text`, text);
}

function _testIdCandidate(target: Element): SelectorString | null {
	const dataTestId = target.getAttribute(`data-testid`);
	if (dataTestId) { return `testid/${dataTestId}`; }
	const dataQa = target.getAttribute(`data-qa`);
	return dataQa ? `testid/${dataQa}` : null;
}

// href identifies an anchor's actual navigation target regardless of ambiguous/duplicated text or
// aria-label — e.g. a page that renders the same link twice for responsive layouts
function _hrefCandidate(target: Element): SelectorString | null {
	if (!(target instanceof HTMLAnchorElement)) { return null; }
	const href = target.getAttribute(`href`);
	return href ? `href/${href}` : null;
}

// The two candidates derived from what the element *says* — split out both to keep
// computeSelectorGroup under the complexity ceiling and because they share the ignoreOwnText escape.
function _contentCandidates(target: Element, ignoreOwnText: SelectorCaptureOptions[`ignoreOwnText`]): SelectorGroup {
	const candidates: ElementClassList = [];

	// only the target's *own* name computation honors ignoreOwnText — the uniqueness scans inside
	// these helpers compare against every other element's default-computed name, and must keep doing so
	const accessibleName = _computeAccessibleName(target, ignoreOwnText);
	const accessibleNameCandidate = accessibleName ? _accessibleNameCandidate(target, accessibleName) : null;
	if (accessibleNameCandidate) { candidates.push(accessibleNameCandidate); }

	const text = ignoreOwnText ? `` : _normalizeText(target.textContent || ``);
	const textCandidate = text && text.length <= TEXT_CANDIDATE_MAX_LENGTH ? _textCandidate(target, text) : null;
	if (textCandidate) { candidates.push(textCandidate); }

	return candidates;
}

/**
 * Priority order for capture: aria name -> visible text -> ancestor-scoped aria/text -> testid ->
 * href (anchors) -> #id -> CSS. This matches what Testing Library / Playwright / Cypress converge
 * on (role/text first, test-id as escape hatch, CSS path only when nothing else is available) and
 * is the vocabulary a candidate selector must use to be exportable to real e2e frameworks (see
 * recording.ts SelectorCandidate).
 */
export function computeSelectorGroup(target: Element, options?: SelectorCaptureOptions): SelectorGroup {
	const candidates: ElementClassList = _contentCandidates(target, options?.ignoreOwnText);

	const testIdCandidate = _testIdCandidate(target);
	if (testIdCandidate) { candidates.push(testIdCandidate); }

	const hrefCandidate = _hrefCandidate(target);
	if (hrefCandidate) { candidates.push(hrefCandidate); }

	const id = target.id;
	const usableId = id && _isStableId(id) ? id : null;
	if (usableId) { candidates.push(`#${usableId}`); }

	const uniqueSelector = _getPositionalSelector(target);
	if (uniqueSelector) { candidates.push(uniqueSelector); }

	if (candidates.length === 0) { candidates.push(target.tagName.toLowerCase() as SelectorString); }

	return candidates;
}
