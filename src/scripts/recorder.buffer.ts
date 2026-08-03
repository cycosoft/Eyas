import { ipcRenderer } from 'electron';
import type { RecordingStep } from '@registry/recording.js';
import type { FramePath, DomElement, IsExcluded, IsRetracted } from '@registry/primitives.js';

// The recorder preload's shared capture plumbing: the step buffer, and the two bits of context every
// capture site stamps onto a step. Split out of recorder.ts for max-lines, so the contenteditable
// capture (recorder.editable.ts) can reach the same buffer rather than keeping its own.

export const FLUSH_INTERVAL_MS = 2000;
const FLUSH_AT_STEP_COUNT = 50;

// popupId is not tagged here — the main process tags it on arrival in ipc-handlers.recorder.ts,
// keyed off which webContents the flush IPC came from, since a popup's injected global doesn't
// reliably survive its first navigation

let _buffer: RecordingStep[] = [];

export function isExcluded(target: DomElement): IsExcluded {
	return !!target.closest(`[data-eyas-no-record]`);
}

export function computeFramePath(): FramePath | undefined {
	if (window === window.top) { return undefined; }

	const path: FramePath = [];
	let current: Window = window;

	try {
		while (current !== current.parent) {
			const parent = current.parent;
			const siblings = Array.prototype.slice.call(parent.frames);
			const index = siblings.indexOf(current);
			path.unshift(index === -1 ? 0 : index);
			current = parent;
		}
	} catch {
		// cross-origin frame access threw a SecurityException — stop walking and use what we have
	}

	return path;
}

export function pushStep(step: RecordingStep): void {
	_buffer.push(step);
	if (_buffer.length >= FLUSH_AT_STEP_COUNT) { flushSteps(); }
}

/**
 * Buffers a step that may still be withdrawn, deliberately skipping the size-based flush so it's
 * still here for {@link retractStep}. One step of overshoot past the flush threshold is harmless;
 * a step that gets flushed away and then needs retracting is not.
 */
export function pushRetractableStep(step: RecordingStep): void {
	_buffer.push(step);
}

/** Withdraws a step buffered by {@link pushRetractableStep}, if it's still the most recent one. */
export function retractStep(step: RecordingStep): IsRetracted {
	if (_buffer[_buffer.length - 1] !== step) { return false; }
	_buffer.pop();
	return true;
}

export function flushSteps(): void {
	if (_buffer.length === 0) { return; }
	ipcRenderer.send(`recorder-flush-steps`, _buffer);
	_buffer = [];
}
