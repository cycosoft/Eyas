import type { ProjectId, TimestampMS, ViewportWidth, ViewportHeight, ScreenCoordinate, FramePath, DomainUrl, PopupId, CursorOffset, StepCount, StepIndex, SelectorString, AccessibleName, CdpModifierMask } from './primitives.js';

/** Viewport dimensions for the recording session */
type Viewport = {
	width: ViewportWidth;
	height: ViewportHeight;
}

/**
 * A single candidate locator for an element, modeled on the Chrome DevTools Recorder /
 * @puppeteer/replay convention: `aria/<accessible name>`, `text/<visible text>`,
 * `scoped-aria/<{scope, name} JSON>` / `scoped-text/<{scope, name} JSON>` (an accessible-name/text
 * match that's only unique once qualified by a nearby ancestor — see recorder.ts
 * _computeScopedSelector), `testid/<data-testid or data-qa value>`, `href/<anchor href>`, or a
 * plain CSS selector string (no prefix) as the last-resort fallback.
 */
type SelectorCandidate = string;

/** Ordered candidate list for an element, most-reliable first. Tried in order during replay. */
export type SelectorGroup = SelectorCandidate[];

/** Decoded payload of a `scoped-aria/`/`scoped-text/` candidate — see recorder.ts _computeScopedSelector. */
export type ScopedSelectorPayload = {
	scope: SelectorString;
	name: AccessibleName;
}

/** Resolved viewport coordinates of an element to click during replay. */
export type ClickPoint = {
	x: number;
	y: number;
}

type ValueBearingElementShape = {
	value?: string;
}

/** A DOM element narrowed to just the value-bearing shape our replay scripts read/write (inputs, textareas, selects — checked via `typeof .value === 'string'` at runtime, not `instanceof`, since these run browser-side against an unknown page). */
export type ValueBearingElement = Element & ValueBearingElementShape;

type SelectableValueElementShape = {
	setSelectionRange?: (start: CursorOffset, end: CursorOffset) => void;
}

/** A {@link ValueBearingElement} that also supports cursor-based text selection, for per-keystroke replay. */
export type SelectableValueElement = ValueBearingElement & SelectableValueElementShape;

/** Cursor position within a text field at the moment a keydown was captured. */
export type CursorSelection = {
	selectionStart?: number;
	selectionEnd?: number;
}

/** A Windows virtual key code, as CDP's `Input.dispatchKeyEvent` expects for an editing command. */
export type VirtualKeyCode = number;

/**
 * The `Input.dispatchKeyEvent` fields that make Blink actually carry out an edit — `text` for a
 * printable character, a virtual key code for an editing command such as Backspace/Delete. A key
 * event carrying only `key` dispatches to the page but inserts and deletes nothing.
 */
export type KeyEventEditingPayload = {
	text?: KeyDownStep[`key`];
	windowsVirtualKeyCode?: VirtualKeyCode;
	nativeVirtualKeyCode?: VirtualKeyCode;
}

/** The held-modifier half of an `Input.dispatchKeyEvent` payload, omitted when nothing was held. */
export type KeyEventModifierPayload = {
	modifiers?: CdpModifierMask;
}

/**
 * Chrome DevTools Recorder / @puppeteer/replay mouse button names. Absent on a
 * {@link ClickStep} means `primary`, which is what every session recorded before
 * right-click capture existed looks like — so old recordings replay unchanged.
 */
export type MouseButton = `primary` | `auxiliary` | `secondary` | `back` | `forward`;

export type ClickStep = {
	type: `click`;
	/** Omitted for a normal left click; `secondary` is a right click. */
	button?: MouseButton;
	selectors: SelectorGroup;
	offsetX: ScreenCoordinate;
	offsetY: ScreenCoordinate;
	frame?: FramePath;
	popupId?: PopupId;
	timestamp: TimestampMS;
}

export type InputStep = {
	type: `change`;
	selectors: SelectorGroup;
	value: string;
	frame?: FramePath;
	popupId?: PopupId;
	timestamp: TimestampMS;
}

/**
 * The contenteditable analogue of {@link InputStep}: what a rich-text editor said when the user
 * left it. Captured on blur, and only if the text actually changed while they were in it,
 * mirroring `change` semantics — a root has no `.value` and never fires `change` itself.
 *
 * On replay this is an *assertion*, not a repair (see session-playback.assertions.ts). Writing the
 * recorded text back into the editor would overwrite whatever the app under test actually produced,
 * destroying the only signal the tester recorded this for.
 */
export type EditableChangeStep = {
	type: `editableChange`;
	selectors: SelectorGroup;
	/** The editor's `innerText` at blur — plain text, and the value replay checks the page against. */
	text: string;
	frame?: FramePath;
	popupId?: PopupId;
	timestamp: TimestampMS;
}

/**
 * A recorded expectation that didn't hold on replay. Collected across the whole run and reported at
 * the end rather than aborting on the first one: a mismatch is a finding, not a crash, and stopping
 * would discard every finding after it.
 */
export type ReplayMismatch = {
	/** The first candidate from the step's {@link SelectorGroup}, for identifying the element to a human. */
	selector: SelectorString;
	expected: string;
	/** `null` when the element itself never resolved on the page — a distinct failure from wrong text. */
	actual: string | null;
	stepIndex: StepIndex;
}

/**
 * Text entered into a contenteditable root, taken from the browser's own account of the edit (the
 * `input` event) rather than reconstructed from keystrokes. Keystroke capture only ever worked for
 * literal typing — a paste records `Control`+`v` and nothing else, and autocorrect/replacement
 * records nothing at all — so replay of anything else left the editor empty or wrong.
 *
 * Carries no selectors for the same reason {@link KeyDownStep} doesn't: it replays into whatever
 * the recorded clicks focused, at the caret they left behind.
 */
export type EditableInputStep = {
	type: `editableInput`;
	/** The browser's own classification: `insertText`, `insertFromPaste`, `insertReplacementText`, … */
	inputType: string;
	/** The text this edit introduced — from `data`, or from `dataTransfer` for a paste or drop. */
	data: string;
	frame?: FramePath;
	popupId?: PopupId;
	timestamp: TimestampMS;
}

/** Capture-time knobs for `computeSelectorGroup` (src/scripts/recorder.selectors.ts). */
export type SelectorCaptureOptions = {
	/**
	 * Skip the candidates derived from the element's own text — the `textContent` fallback inside the
	 * accessible-name computation, and the `text/` candidate. Set when capturing a contenteditable
	 * root: its text is the very thing an {@link EditableChangeStep} exists to repair, so a
	 * content-derived candidate would fail to resolve in exactly the case the repair is needed.
	 */
	ignoreOwnText?: boolean;
}

/**
 * Modifier keys held when a key event was captured. Flags are omitted rather than set false, and
 * the whole object is omitted for an unmodified key, so an ordinary keystroke's step is unchanged
 * from what earlier recorders wrote.
 *
 * Recorded semantically rather than as a CDP modifier bitmask: the session file stays legible and
 * exportable to frameworks that don't share CDP's encoding. The bitmask is derived at replay
 * (session-playback.keystrokes.ts modifierBitmask).
 */
export type KeyModifiers = {
	alt?: boolean;
	ctrl?: boolean;
	meta?: boolean;
	shift?: boolean;
}

export type KeyDownStep = {
	type: `keyDown`;
	key: string;
	/** Absent on sessions recorded before modifier capture — replay infers those from surrounding steps instead. */
	modifiers?: KeyModifiers;
	selectionStart?: CursorSelection[`selectionStart`];
	selectionEnd?: CursorSelection[`selectionEnd`];
	frame?: FramePath;
	popupId?: PopupId;
	timestamp: TimestampMS;
}

export type KeyUpStep = {
	type: `keyUp`;
	key: string;
	modifiers?: KeyModifiers;
	frame?: FramePath;
	popupId?: PopupId;
	timestamp: TimestampMS;
}

export type ScrollStep = {
	type: `scroll`;
	x: ScreenCoordinate;
	y: ScreenCoordinate;
	frame?: FramePath;
	popupId?: PopupId;
	timestamp: TimestampMS;
}

type NavigateStep = {
	type: `navigate`;
	url: string;
	timestamp: TimestampMS;
}

type CloseWindowStep = {
	type: `closeWindow`;
	popupId: PopupId;
	timestamp: TimestampMS;
}

export type RecordingStep =
	| ClickStep
	| InputStep
	| EditableChangeStep
	| EditableInputStep
	| KeyDownStep
	| KeyUpStep
	| ScrollStep
	| NavigateStep
	| CloseWindowStep;

/** Zero-based index of the user-facing "action" a step belongs to, or -1 if the step doesn't count as one (see StepActionMap). */
export type StepActionIndex = number;

/**
 * Maps each RecordingStep to the progress-ring "action" it belongs to: a click and the
 * `navigate` step(s) it causes (including redirect chains) share one action index, and `scroll`
 * steps get -1 since they aren't a user-facing action at all. `totalActions` is the count of
 * distinct actions, i.e. what the progress ring treats as its 100%.
 */
export type StepActionMap = {
	actionIndexes: StepActionIndex[];
	totalActions: StepCount;
}

/** W3C Chrome DevTools Recorder root object */
type ChromeRecorderSession = {
	title: string;
	steps: RecordingStep[];
}

/** Populated in Deliverable 10; reserved for future component metadata */
type EyasComponent = Record<string, unknown>;

/** Sessions written by the 1.0.0 recorder store `selectors` as `{ primary, fallbacks }` instead of a candidate array. */
export type LegacySelectorGroup = {
	primary: string;
	fallbacks: string[];
}

/**
 * Eyas outer envelope — wraps the standard W3C Chrome Recorder JSON.
 *
 * `eyasSchemaVersion` history:
 * - `1.0.0` — `selectors` stored as `{ primary, fallbacks }`; upgraded on read (_upgradeSession).
 * - `1.1.0` — ordered selector-candidate arrays.
 * - `1.2.0` — text typed into a contenteditable root is recorded as {@link EditableInputStep}
 *   instead of per-character {@link KeyDownStep}s. Bumped even though the step type is additive,
 *   because the *suppression* isn't: an older build skips the step type it doesn't recognize
 *   (session-playback.service.ts _dispatchStep) and finds no keystrokes behind it, so a rich-text
 *   editor replays empty rather than degrading gracefully. Nothing reads the version to guard
 *   against that yet — see TODO.md — but the boundary is recorded so it can.
 *
 * Reading older sessions is unaffected in both directions this build cares about: a 1.1.0 session
 * still carries its keystrokes and replays exactly as before, so there is nothing to migrate.
 */
export type EyasRecordingEnvelope = {
	eyasSchemaVersion: `1.0.0` | `1.1.0` | `1.2.0`;
	projectId: ProjectId;
	sessionId: string;
	title: string;
	status: `recording` | `stopped`;
	startedAt: TimestampMS;
	stoppedAt: TimestampMS | null;
	startUrl: DomainUrl | null;
	viewport: Viewport;
	components: Record<string, EyasComponent>;
	recording: ChromeRecorderSession;
}

/** IPC payload for recorder status updates */
export type RecorderStatusPayload = {
	isRecording: boolean;
	sessionId: string | null;
}
