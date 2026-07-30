import type { JsSnippet, VariableValue } from '@registry/primitives.js';
import type { SelectorGroup } from '@registry/recording.js';

// Browser-side element resolution shared by both the click-point script and the change-dispatch
// script below. Mirrors the same documented W3C-accname subset used at capture time
// (src/scripts/recorder.ts _computeAccessibleName) so a candidate that matched uniquely during
// recording resolves to the same element during replay. Tries each candidate in priority order —
// aria/text candidates were only captured when they uniquely identified one element, so a single
// match is expected; the CSS/testid fallback candidates use querySelectorAll so a caller-supplied
// visibility check can pick among duplicate matches (e.g. responsive-breakpoint duplicates).
const _RESOLVER_SNIPPET = `
	function normalizeText(t) { return (t || '').replace(/\\s+/g, ' ').trim(); }
	function computeLabelledName(el) {
		var labelledBy = el.getAttribute('aria-labelledby');
		if (labelledBy) {
			var text = labelledBy.split(/\\s+/).map(function(id) { var e = document.getElementById(id); return e ? e.textContent : ''; }).join(' ');
			if (normalizeText(text)) { return normalizeText(text); }
		}
		if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
			var id = el.id;
			var forLabel = id ? document.querySelector('label[for="' + id + '"]') : null;
			var label = forLabel || el.closest('label');
			if (label) {
				var labelText = normalizeText(label.textContent || '');
				if (labelText) { return labelText; }
			}
		}
		return null;
	}
	function computeAccessibleName(el) {
		var ariaLabel = el.getAttribute('aria-label');
		if (ariaLabel) { return normalizeText(ariaLabel); }
		var labelled = computeLabelledName(el);
		if (labelled) { return labelled; }
		var alt = el.getAttribute('alt');
		if (alt) { return normalizeText(alt); }
		var title = el.getAttribute('title');
		if (title) { return normalizeText(title); }
		var placeholder = el.getAttribute('placeholder');
		if (placeholder) { return normalizeText(placeholder); }
		if (el.children.length === 0) {
			var text = normalizeText(el.textContent || '');
			if (text) { return text; }
		}
		return null;
	}
	function findByAria(name) {
		var els = document.querySelectorAll('*:not(label)');
		for (var i = 0; i < els.length; i++) { if (computeAccessibleName(els[i]) === name) { return [els[i]]; } }
		return [];
	}
	function findByText(text) {
		var els = document.querySelectorAll('*');
		var matches = [];
		for (var i = 0; i < els.length; i++) { if (normalizeText(els[i].textContent || '') === text) { matches.push(els[i]); } }
		// document order surfaces ancestors (html/body/wrapper divs) before the leaf a user actually
		// clicked, since an ancestor's textContent includes its matching descendant's — prefer the
		// innermost match (no descendant also matches), same as Playwright's getByText semantics.
		for (var j = 0; j < matches.length; j++) {
			var hasMatchingDescendant = false;
			for (var k = 0; k < matches.length; k++) {
				if (k !== j && matches[j].contains(matches[k])) { hasMatchingDescendant = true; break; }
			}
			if (!hasMatchingDescendant) { return [matches[j]]; }
		}
		return matches.length ? [matches[0]] : [];
	}
	function candidatesForSelector(cand) {
		if (cand.indexOf('aria/') === 0) { return findByAria(cand.slice(5)); }
		if (cand.indexOf('text/') === 0) { return findByText(cand.slice(5)); }
		var cssSelector = cand.indexOf('testid/') === 0
			? (function(v) { return '[data-testid="' + v + '"], [data-qa="' + v + '"]'; })(cand.slice(7))
			: cand;
		try { return Array.prototype.slice.call(document.querySelectorAll(cssSelector)); } catch (e) { return []; }
	}
`;

// step.offsetX/offsetY are viewport-relative at record time and can drift from replay-time layout,
// so we resolve the recorded selector to its actual on-page position instead. Tries every
// candidate in priority order (aria -> text -> testid -> CSS), and within a CSS/testid candidate's
// matches, walks all of them and takes the first one that's actually visible — some pages (e.g.
// GitHub's file browser) render duplicate matches for responsive breakpoints.
export function buildClickPointScript(candidates: SelectorGroup): JsSnippet {
	return `(function(candidates){
		${_RESOLVER_SNIPPET}
		function isVisible(el) {
			if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') { return false; }
			const rect = el.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0;
		}
		// getBoundingClientRect() on an inline element that wraps across multiple lines (e.g. a link
		// mid-sentence in a paragraph) returns a box spanning every line it touches — its center can
		// land in the gap between lines, which belongs to the parent, not the element. getClientRects()
		// gives one rect per line box instead; take the center of the first line whose own center
		// point actually hit-tests back to this element (or a descendant), falling back to the
		// bounding-box center only if no individual line rect passes that check.
		function clickPoint(el) {
			for (const rect of el.getClientRects()) {
				if (rect.width === 0 || rect.height === 0) { continue; }
				const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
				const hit = document.elementFromPoint(x, y);
				if (hit && (hit === el || el.contains(hit))) { return { x, y }; }
			}
			const b = el.getBoundingClientRect();
			return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
		}
		for (const cand of candidates) {
			for (const el of candidatesForSelector(cand)) {
				// pages may set CSS scroll-behavior: smooth — force an instant jump so the
				// rects read immediately after reflect the post-scroll position
				el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
				if (!isVisible(el)) { continue; }
				return clickPoint(el);
			}
		}
		return null;
	})(${JSON.stringify(candidates)})`;
}

// Same candidate-priority resolution as buildClickPointScript, but for setting an input's value
// and dispatching input/change rather than clicking — see _dispatchChange in
// session-playback.service.ts for why .value is set directly instead of using CDP Input.insertText.
export function buildChangeScript(candidates: SelectorGroup, value: VariableValue): JsSnippet {
	return `(function(candidates, value){
		${_RESOLVER_SNIPPET}
		for (const cand of candidates) {
			const matches = candidatesForSelector(cand);
			if (matches.length === 0) { continue; }
			const el = matches[0];
			if (el.value !== value) {
				el.value = value;
				el.dispatchEvent(new Event('input', { bubbles: true }));
			}
			el.dispatchEvent(new Event('change', { bubbles: true }));
			return;
		}
	})(${JSON.stringify(candidates)}, ${JSON.stringify(value)})`;
}
