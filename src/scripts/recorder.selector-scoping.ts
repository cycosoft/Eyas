import type { ScopedSelectorPayload } from '@registry/recording.js';
import type { SelectorString, AccessibleName, IsMatch, Count, IsStableId, DomIdAttribute } from '@registry/primitives.js';

// escapes a value for embedding in a CSS identifier/attribute-value position — CSS.escape isn't
// relied on here since capture must behave the same in every renderer this preload runs in
function _escapeForSelector(value: SelectorString): SelectorString {
	return value.replace(/([^a-zA-Z0-9_-])/g, `\\$1`);
}

const STABLE_ID_PATTERN = /^[a-zA-Z_-]+$/;

function _isStableId(id: DomIdAttribute): IsStableId {
	return STABLE_ID_PATTERN.test(id);
}

// a single-level descriptor for one ancestor, used only to *scope* a search (see
// computeScopedSelector) — unlike the positional CSS fallback this doesn't need to be page-unique
// by itself, just specific enough that combining it with "contains this name" narrows to one match
function _getScopeSelectorFragment(el: Element): SelectorString {
	const dataTestId = el.getAttribute(`data-testid`);
	if (dataTestId) { return `[data-testid="${dataTestId.replace(/"/g, `\\"`)}"]`; }
	const dataQa = el.getAttribute(`data-qa`);
	if (dataQa) { return `[data-qa="${dataQa.replace(/"/g, `\\"`)}"]`; }
	const id = el.id;
	if (id && _isStableId(id)) { return `#${_escapeForSelector(id)}`; }
	if (el.classList.length > 0) { return `${el.tagName.toLowerCase()}.${Array.from(el.classList).map(_escapeForSelector).join(`.`)}`; }
	return el.tagName.toLowerCase();
}

// counts how many elements matching scopeSelector contain a descendant satisfying `matches` —
// used to test whether a candidate ancestor scope narrows an otherwise-ambiguous name down to one
function _countScopedMatches(scopeSelector: SelectorString, matches: (el: Element) => IsMatch): Count {
	let count: Count = 0;
	let roots: NodeListOf<Element>;
	try { roots = document.querySelectorAll(scopeSelector); } catch { return 0; }
	for (let i = 0; i < roots.length; i++) {
		const descendants = roots[i].querySelectorAll(`*`);
		for (let j = 0; j < descendants.length; j++) {
			if (matches(descendants[j])) { count++; break; }
		}
		if (count > 1) { return count; }
	}
	return count;
}

const MAX_SCOPE_CLIMB_DEPTH = 8;

// When an accessible name/text isn't unique on its own (e.g. a responsive layout renders the same
// row twice — once per breakpoint, as GitHub's file browser does), walk up from the target looking
// for the closest ancestor whose own scope, combined with the name, narrows back down to exactly
// one match — a real Playwright/Testing-Library user would reach for the same "scope by a nearby
// landmark" technique rather than accept a name that matches more than one element. Stops at
// document.body (scoping to the whole page re-creates the same ambiguity) or after
// MAX_SCOPE_CLIMB_DEPTH ancestors, returning null if no ancestor ever disambiguates.
export function computeScopedSelector(target: Element, matches: (el: Element) => IsMatch, kind: `scoped-aria` | `scoped-text`, name: AccessibleName): SelectorString | null {
	let ancestor = target.parentElement;
	let depth: Count = 0;
	while (ancestor && ancestor !== document.body && depth < MAX_SCOPE_CLIMB_DEPTH) {
		const scope = _getScopeSelectorFragment(ancestor);
		if (_countScopedMatches(scope, matches) === 1) {
			const payload: ScopedSelectorPayload = { scope, name };
			return `${kind}/${JSON.stringify(payload)}`;
		}
		ancestor = ancestor.parentElement;
		depth++;
	}
	return null;
}
