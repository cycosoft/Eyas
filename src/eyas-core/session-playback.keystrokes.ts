import type { RecordingStep, KeyDownStep, KeyEventEditingPayload, VirtualKeyCode } from '@registry/recording.js';

// Everything a replayed key event needs beyond `key` itself. Split out of
// session-playback.service.ts for max-lines; see _dispatchKeyDown there for when this path is taken.

const EDITING_KEY_CODES: Record<KeyDownStep[`key`], VirtualKeyCode> = { Backspace: 8, Delete: 46 };

// Shift is absent deliberately: it produces the character rather than a command, and `key` was
// already recorded in its shifted form ("A", not "a"), so it must not suppress text insertion.
const COMMAND_MODIFIER_KEYS = new Set([`Control`, `Alt`, `Meta`]);
const _heldModifiers = new Set<KeyDownStep[`key`]>();

/**
 * The `Input.dispatchKeyEvent` fields that make Blink carry out the edit. A contenteditable root
 * (a rich-text editor) has no `.value` for the splice path to mutate, so every keystroke in one
 * lands here — where a key event carrying only `key` dispatches to the page but types nothing.
 */
export function editingPayload(key: KeyDownStep[`key`]): KeyEventEditingPayload {
	// a chord records its non-modifier half as a plain character (Ctrl+A arrives as `a`), so
	// inserting text here would type a literal "a" instead of selecting all. KeyDownStep carries no
	// modifier state of its own, hence tracking it across the step loop — see trackModifier.
	if (_heldModifiers.size > 0) { return {}; }
	if (key.length === 1) { return { text: key }; }
	const code = EDITING_KEY_CODES[key];
	return code === undefined ? {} : { windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
}

/** Feeds every step through modifier bookkeeping, so {@link editingPayload} knows what's held. */
export function trackModifier(step: RecordingStep): void {
	if (step.type !== `keyDown` && step.type !== `keyUp`) { return; }
	if (!COMMAND_MODIFIER_KEYS.has(step.key)) { return; }
	if (step.type === `keyDown`) { _heldModifiers.add(step.key); } else { _heldModifiers.delete(step.key); }
}

/** A replay aborted mid-chord leaves a modifier "held" — it must not suppress the next replay's text. */
export function resetModifiers(): void {
	_heldModifiers.clear();
}
