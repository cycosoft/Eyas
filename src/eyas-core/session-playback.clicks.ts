import type { ClickStep, ClickPoint } from '@registry/recording.js';
import type { DurationMS } from '@registry/primitives.js';
import { buildClickPointScript } from './session-playback.selector-resolution.js';

// Click resolution and dispatch, split out of session-playback.service.ts for max-lines — see
// _dispatchStep there for where this is called from.

const CLICK_TARGET_POLL_TIMEOUT_MS = 5000 as DurationMS;
const CLICK_TARGET_POLL_INTERVAL_MS = 100 as DurationMS;

function _delay(ms: DurationMS): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

// SPA-style navigations (e.g. GitHub's client-side directory browser) never trip
// isLoading()/did-stop-loading, so poll the full candidate list — aria/text/testid/CSS, in
// priority order, matching the auto-wait model of real e2e frameworks — until one resolves or the
// timeout is spent, retrying the whole candidate list on each poll so a page still mid-navigation
// gets another chance rather than failing on the first miss. A client-side re-render can pass
// through a transient frame where a stale/duplicate element still matches — require the same point
// on two consecutive polls before accepting it, so a one-off transient match is discarded.
async function _resolveClickPoint(target: Electron.WebContents, step: ClickStep): Promise<ClickPoint | null> {
	const script = buildClickPointScript(step.selectors);
	const deadline = Date.now() + CLICK_TARGET_POLL_TIMEOUT_MS;
	let lastPoint: ClickPoint | null = null;
	for (;;) {
		let point: ClickPoint | null;
		try {
			point = await target.executeJavaScript(script);
		} catch {
			return null;
		}
		if (point && lastPoint && point.x === lastPoint.x && point.y === lastPoint.y) { return point; }
		lastPoint = point;
		// deadline reached without two consecutive matches: fall back to the last point seen rather
		// than failing outright — a page whose target keeps drifting (image load reflowing content,
		// sticky header settling) still gets its most recent resolution, matching the old undebounced
		// behavior as a floor; genuinely never-resolved (lastPoint still null) still fails the step
		if (Date.now() >= deadline) { return lastPoint; }
		await _delay(CLICK_TARGET_POLL_INTERVAL_MS);
	}
}

// no coordinate fallback: replaying raw recorded offsetX/offsetY against a page that hasn't
// necessarily scrolled/laid out the same way as it did at record time is a silent-wrong-click risk
// (see the SelectorGroup poll above) — if the target genuinely never resolves, fail the step loudly
// rather than click whatever now happens to sit at that pixel
export async function dispatchClick(target: Electron.WebContents, step: ClickStep): Promise<void> {
	const resolved = await _resolveClickPoint(target, step);
	if (!resolved) {
		throw new Error(`Could not locate click target "${step.selectors[0]}" on the page.`);
	}
	const { x, y } = resolved;
	// `button` is absent on every step recorded before right-click capture, and on every left
	// click since — so the default here is what keeps those sessions replaying unchanged.
	const button = step.button === `secondary` ? `right` : `left`;
	// both halves are required even though only one produces the contextmenu event: Blink
	// synthesizes it from the release on Windows/Linux and the press on macOS, so dispatching
	// a single half replays as nothing on one platform or the other.
	await target.debugger.sendCommand(`Input.dispatchMouseEvent`, { type: `mousePressed`, x, y, button, clickCount: 1 });
	await target.debugger.sendCommand(`Input.dispatchMouseEvent`, { type: `mouseReleased`, x, y, button, clickCount: 1 });
}
