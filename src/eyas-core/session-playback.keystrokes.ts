import type { RecordingStep, KeyDownStep, KeyUpStep, KeyModifiers, KeyEventEditingPayload, KeyEventModifierPayload, VirtualKeyCode } from '@registry/recording.js';
import type { CdpModifierMask, IsCommandChord } from '@registry/primitives.js';

// Everything a replayed key event needs beyond `key` itself. Split out of
// session-playback.service.ts for max-lines; see _dispatchKeyDown there for when this path is taken.

const EDITING_KEY_CODES: Record<KeyDownStep[`key`], VirtualKeyCode> = { Backspace: 8, Delete: 46 };

// CDP's Input.dispatchKeyEvent packs the held modifiers into one integer.
const CDP_ALT = 1, CDP_CTRL = 2, CDP_META = 4, CDP_SHIFT = 8;

/** Translates the recorded modifier flags into the bitmask CDP wants. */
function _modifierBitmask(modifiers?: KeyModifiers): CdpModifierMask {
	if (!modifiers) { return 0; }
	let mask: CdpModifierMask = 0;
	if (modifiers.alt) { mask |= CDP_ALT; }
	if (modifiers.ctrl) { mask |= CDP_CTRL; }
	if (modifiers.meta) { mask |= CDP_META; }
	if (modifiers.shift) { mask |= CDP_SHIFT; }
	return mask;
}

// Shift is absent deliberately: it produces the character rather than a command, and `key` was
// already recorded in its shifted form ("A", not "a"), so it must not suppress text insertion.
const COMMAND_MODIFIER_KEYS = new Set([`Control`, `Alt`, `Meta`]);
const _heldModifiers = new Set<KeyDownStep[`key`]>();

/**
 * Whether this key is the character half of a chord (Ctrl+A, Cmd+B) rather than text to type.
 *
 * Sessions recorded before modifier capture carry no `modifiers` at all, so the held state has to be
 * inferred from the preceding steps — that's what {@link trackModifier} maintains. A step that
 * records its own modifiers is believed instead: inference breaks whenever a modifier is pressed
 * before recording starts, or released while the window doesn't have focus.
 */
function _isCommandChord(step: KeyDownStep): IsCommandChord {
	if (step.modifiers) { return !!(step.modifiers.ctrl || step.modifiers.alt || step.modifiers.meta); }
	return _heldModifiers.size > 0;
}

/**
 * The `Input.dispatchKeyEvent` fields that make Blink carry out the edit. Reached by the editing
 * keys and chords inside a contenteditable root (its typed text is replayed from
 * {@link EditableInputStep} instead) — and there, a key event carrying only `key` types nothing.
 */
export function editingPayload(step: KeyDownStep): KeyEventEditingPayload {
	// inserting text for a chord's character half would type a literal "a" instead of selecting all
	if (_isCommandChord(step)) { return {}; }
	if (step.key.length === 1) { return { text: step.key }; }
	const code = EDITING_KEY_CODES[step.key];
	return code === undefined ? {} : { windowsVirtualKeyCode: code, nativeVirtualKeyCode: code };
}

/**
 * Feeds every step through modifier bookkeeping, for sessions that don't record their own — see
 * {@link _isCommandChord}. Harmless for sessions that do.
 */
export function trackModifier(step: RecordingStep): void {
	if (step.type !== `keyDown` && step.type !== `keyUp`) { return; }
	if (!COMMAND_MODIFIER_KEYS.has(step.key)) { return; }
	if (step.type === `keyDown`) { _heldModifiers.add(step.key); } else { _heldModifiers.delete(step.key); }
}

/** A replay aborted mid-chord leaves a modifier "held" — it must not suppress the next replay's text. */
export function resetModifiers(): void {
	_heldModifiers.clear();
}

/** The full CDP payload for a recorded key event, modifiers included. */
export function keyEventPayload(step: KeyDownStep | KeyUpStep): KeyEventModifierPayload {
	const modifiers = _modifierBitmask(step.modifiers);
	return modifiers > 0 ? { modifiers } : {};
}
