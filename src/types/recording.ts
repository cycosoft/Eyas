import type { ProjectId, TimestampMS, ViewportWidth, ViewportHeight, ScreenCoordinate, FramePath, DomainUrl, PopupId } from './primitives.js';

/** Viewport dimensions for the recording session */
type Viewport = {
	width: ViewportWidth;
	height: ViewportHeight;
}

/** A captured selector with priority fallbacks. Primary is tried first during replay. */
export type SelectorGroup = {
	primary: string;
	fallbacks: string[];
}

/** Resolved viewport coordinates of an element to click during replay. */
export type ClickPoint = {
	x: number;
	y: number;
}

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

/** W3C Chrome DevTools Recorder root object */
type ChromeRecorderSession = {
	title: string;
	steps: RecordingStep[];
}

/** Populated in Deliverable 10; reserved for future component metadata */
type EyasComponent = Record<string, unknown>;

/** Eyas outer envelope — wraps the standard W3C Chrome Recorder JSON */
export type EyasRecordingEnvelope = {
	eyasSchemaVersion: `1.0.0`;
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
