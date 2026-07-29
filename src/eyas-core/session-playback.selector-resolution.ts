import type { SelectorString, JsSnippet } from '@registry/primitives.js';

// step.offsetX/offsetY are viewport-relative at record time and can drift from replay-time layout,
// so we resolve the recorded selector to its actual on-page position instead. Some pages (e.g.
// GitHub's file browser) render duplicate matches for responsive breakpoints — walk all matches
// and take the first one that's actually visible rather than trusting DOM order.
export function buildClickPointScript(selector: SelectorString): JsSnippet {
	return `(function(sel){
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
		let els;
		try { els = document.querySelectorAll(sel); } catch { els = []; }
		for (const el of els) {
			// pages may set CSS scroll-behavior: smooth — force an instant jump so the
			// rects read immediately after reflect the post-scroll position
			el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
			if (!isVisible(el)) { continue; }
			return clickPoint(el);
		}
		return null;
	})(${JSON.stringify(selector)})`;
}
