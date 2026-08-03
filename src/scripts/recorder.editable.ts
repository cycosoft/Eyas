import type { RecordingStep, KeyDownStep } from '@registry/recording.js';
import type { VariableValue, IsRetractable } from '@registry/primitives.js';
import { computeSelectorGroup } from './recorder.selectors.js';
import { pushStep, pushRetractableStep, retractStep, flushSteps, isExcluded, computeFramePath } from './recorder.buffer.js';

// Contenteditable capture, split out of recorder.ts for max-lines. A rich-text editor shares none of
// the machinery an <input> gets: no `.value`, no `change` event, no cursor selection. What it gets
// instead lives here — its text recorded from the `input` event, and its final state recorded on
// blur for replay to check against (see session-playback.assertions.ts).

/**
 * The editable root a node sits in, or null. `[contenteditable="false"]` is deliberately not
 * matched: an uneditable island inside an editor must resolve to the editor around it, not itself.
 */
function _editableRoot(target: Element | null): HTMLElement | null {
	if (!target) { return null; }
	const root = target.closest(`[contenteditable=""], [contenteditable="true"]`) as HTMLElement | null;
	return root?.isContentEditable ? root : null;
}

let _editableFocus: HTMLElement | null = null;
let _editableFocusText = ``;

export function onFocusIn(event: FocusEvent): void {
	_editableFocus = _editableRoot(event.target as Element | null);
	_editableFocusText = _editableFocus?.innerText ?? ``;
}

// A contenteditable root fires no `change` event, so the final-state record replay checks against is
// captured here instead — on leaving the editor, and only if its text actually moved while the user
// was in it.
function _pushEditableChange(root: HTMLElement): void {
	const text = root.innerText;
	_editableFocus = null;
	if (text === _editableFocusText) { return; }
	if (isExcluded(root)) { return; }

	pushStep({
		type: `editableChange`,
		// the editor's own text can't identify it — that's the value this step exists to check
		selectors: computeSelectorGroup(root, { ignoreOwnText: true }),
		text,
		frame: computeFramePath(),
		timestamp: Date.now()
	});
	// flush immediately for the same reason as _onChange — leaving a field can trigger a same-tick
	// navigation that tears the buffer down
	flushSteps();
}

export function onFocusOut(event: FocusEvent): void {
	// a node detached before focusout reaches it (an editor that re-renders on blur) never bubbles
	// here at all — that edit is caught by the beforeunload sweep instead, or by the next focusin
	// replacing it. No fallback is possible from inside this listener.
	const root = _editableRoot(event.target as Element | null);
	if (!root || root !== _editableFocus) { return; }
	// focus moving *within* the same editor (an inner node, a toolbar button that hands focus back)
	// isn't the end of an edit — recording it mid-edit would assert against a half-typed value
	if (_editableRoot(event.relatedTarget as Element | null) === root) { return; }
	_pushEditableChange(root);
}

/** Navigating away while still inside an editor never fires focusout — capture the pending edit. */
export function flushPendingEditableChange(): void {
	if (_editableFocus) { _pushEditableChange(_editableFocus); }
}

/**
 * The edits recorded from the `input` event instead of from keystrokes. Deliberately narrow: replay
 * inserts `data` at the caret, so an edit only belongs here if that is genuinely what it does.
 *
 * Excluded, and why each would be worse recorded than left out:
 * - anything a surviving keystroke already drives (Enter, formatting shortcuts, word-wise deletion,
 *   undo) — two accounts of one edit apply it twice.
 * - `insertReplacementText` (spellcheck/autocorrect) *replaces* a range the user never selected, and
 *   the range only exists on `beforeinput`'s getTargetRanges(). The characters it replaces were
 *   already recorded as keystrokes, so inserting at the caret turns "teh"→"the" into "tehthe".
 * - `insertCompositionText` — an IME fires it repeatedly with the whole in-progress string, each
 *   firing replacing the last, so replaying the sequence concatenates the partials into garbage.
 * - `insertTranspose` — swaps two existing characters; it introduces no text to insert.
 *
 * None of those replay at all today. That's the deliberate trade: the assertion on leaving the
 * editor reports the difference (see TODO.md) rather than replay quietly producing wrong text.
 */
const TEXT_INSERTING_INPUT_TYPES = new Set([
	`insertText`,
	`insertFromPaste`,
	`insertFromDrop`,
	`insertFromYank`
]);

// A paste or drop leaves `data` empty and carries its payload on dataTransfer instead — verified
// against Chromium, and true of the `input` event, not just `beforeinput`. Chromium reports the
// empty case as null, but an empty string is treated the same way: an insertion of no text isn't
// worth a step either way, and not every engine agrees on which of the two it uses.
function _inputEventText(event: InputEvent): VariableValue | null {
	if (event.data) { return event.data; }
	const transferred = event.dataTransfer?.getData(`text/plain`);
	return transferred || null;
}

// A printable keystroke in an editor is *usually* superseded by the input event it produces — but
// only the input event knows whether it actually was. A dead key composes instead (verified: it
// fires insertCompositionText, which isn't replayable), so predicting suppression from the key alone
// would silently drop accented characters that replay correctly today. The keystroke is therefore
// recorded first and retracted only once a replacement genuinely exists.
let _retractableKeyDown: RecordingStep | null = null;
let _suppressedKeyUp: KeyDownStep[`key`] | null = null;

export function onInput(event: Event): void {
	const inputEvent = event as InputEvent;
	const root = _editableRoot(event.target as Element | null);
	if (!root) { return; }
	if (isExcluded(root)) { return; }
	if (!TEXT_INSERTING_INPUT_TYPES.has(inputEvent.inputType)) { return; }

	const data = _inputEventText(inputEvent);
	if (data === null) { return; }

	const pending = _retractableKeyDown;
	_retractableKeyDown = null;
	// its keyUp has to go with it, or the page sees half a key sequence
	if (pending?.type === `keyDown` && retractStep(pending)) { _suppressedKeyUp = pending.key; }

	// takes the retracted keystroke's place, keeping the sequence in order
	pushStep({ type: `editableInput`, inputType: inputEvent.inputType, data, frame: computeFramePath(), timestamp: Date.now() });
}

/**
 * Whether this keystroke might be superseded by an `input` event, and so shouldn't be committed
 * until that's known. A chord never is: its character half is a command rather than text (Ctrl+A
 * selects, Ctrl+V pastes), so no text-inserting input event stands in for the key.
 */
function _isRetractable(event: KeyboardEvent, target: Element): IsRetractable {
	if (event.ctrlKey || event.metaKey || event.altKey) { return false; }
	if (event.key.length !== 1) { return false; }
	return !!_editableRoot(target);
}

/** Records a keydown, holding it back for possible retraction if an `input` event may supersede it. */
export function pushKeyDown(step: RecordingStep, event: KeyboardEvent, target: Element): void {
	if (_isRetractable(event, target)) {
		_retractableKeyDown = step;
		pushRetractableStep(step);
		return;
	}

	_retractableKeyDown = null;
	pushStep(step);
}

/** Whether this keyup belongs to a keydown that was retracted, and so must be dropped with it. */
export function isSuppressedKeyUp(key: KeyDownStep[`key`]): IsRetractable {
	if (_suppressedKeyUp !== key) { return false; }
	_suppressedKeyUp = null;
	return true;
}
