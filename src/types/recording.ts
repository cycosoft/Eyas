import type { ProjectId, TimestampMS, ViewportWidth, ViewportHeight, ScreenCoordinate, FramePath, DomainUrl, PopupId, CursorOffset, StepCount, SelectorString, AccessibleName } from './primitives.js';

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

export type ClickStep = {
	type: `click`;
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

export type KeyDownStep = {
	type: `keyDown`;
	key: string;
	selectionStart?: CursorSelection[`selectionStart`];
	selectionEnd?: CursorSelection[`selectionEnd`];
	frame?: FramePath;
	popupId?: PopupId;
	timestamp: TimestampMS;
}

type KeyUpStep = {
	type: `keyUp`;
	key: string;
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

/** Eyas outer envelope — wraps the standard W3C Chrome Recorder JSON */
export type EyasRecordingEnvelope = {
	eyasSchemaVersion: `1.0.0` | `1.1.0`;
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
