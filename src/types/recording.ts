import type { ProjectId, TimestampMS, ViewportWidth, ViewportHeight, ScreenCoordinate, FramePath, DomainUrl, PopupId } from './primitives.js';

/** Viewport dimensions for the recording session */
type Viewport = {
	width: ViewportWidth;
	height: ViewportHeight;
}

/** The subset of `window` the recorder preload reads to identify which popup (if any) it's running in — stamped by window.popups.ts via executeJavaScript. */
export type EyasPopupWindow = {
	__eyasPopupId?: PopupId;
}

/** A captured selector with priority fallbacks. Primary is tried first during replay. */
export type SelectorGroup = {
	primary: string;
	fallbacks: string[];
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

type InputStep = {
	type: `change`;
	selectors: SelectorGroup;
	value: string;
	frame?: FramePath;
	popupId?: PopupId;
	timestamp: TimestampMS;
}

type KeyDownStep = {
	type: `keyDown`;
	key: string;
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
