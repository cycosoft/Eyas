import type { RecordingStep, ScopedSelectorPayload, SelectorGroup } from '@registry/recording.js';
import type { DetailText, IconName } from '@registry/primitives.js';

export function describeStep(step: RecordingStep): DetailText {
	switch (step.type) {
	case `click`: return step.button === `secondary` ? `Right click` : `Click`;
	case `change`: return `Enter text`;
	case `editableChange`: return `Edit rich text`;
	case `editableInput`: return `Type into editor`;
	case `keyDown`: return `Key press: ${step.key}`;
	case `keyUp`: return `Key release: ${step.key}`;
	case `scroll`: return `Scroll`;
	case `navigate`: return `Navigate to`;
	case `closeWindow`: return `Close window`;
	default: return `Step`;
	}
}

export function stepIcon(step: RecordingStep): IconName {
	switch (step.type) {
	case `click`: return step.button === `secondary` ? `mdi-cursor-default-click-outline` : `mdi-cursor-default-click`;
	case `change`: return `mdi-form-textbox`;
	case `editableChange`: return `mdi-text-box-edit-outline`;
	case `editableInput`: return `mdi-text-box-edit-outline`;
	case `keyDown`: return `mdi-keyboard-outline`;
	case `keyUp`: return `mdi-keyboard-outline`;
	case `scroll`: return `mdi-gesture-swipe-vertical`;
	case `navigate`: return `mdi-compass-outline`;
	case `closeWindow`: return `mdi-close-box-outline`;
	default: return `mdi-circle-small`;
	}
}

// Turns a step's best selector candidate into plain English — testers only care that it was "Submit", not that it matched via `aria/Submit`. Falls back to the raw candidate for a bare CSS selector, which has no prefix to strip.
function humanizeSelector(selectors: SelectorGroup): DetailText | undefined {
	const selector = selectors[0];
	if (!selector) { return undefined; }

	const separatorIndex = selector.indexOf(`/`);
	if (separatorIndex === -1) { return selector; }

	const prefix = selector.slice(0, separatorIndex);
	const value = selector.slice(separatorIndex + 1);

	if (prefix === `scoped-aria` || prefix === `scoped-text`) {
		try {
			return (JSON.parse(value) as ScopedSelectorPayload).name;
		} catch {
			return value;
		}
	}

	return value || selector;
}

/** Shows only the part of a navigated-to URL a tester cares about: the path, not the domain they were already on. */
function humanizeUrl(url: DetailText): DetailText {
	try {
		const parsed = new URL(url);
		return `${parsed.pathname}${parsed.search}` || `/`;
	} catch {
		return url;
	}
}

export function stepDetail(step: RecordingStep): DetailText | undefined {
	switch (step.type) {
	case `click`: return humanizeSelector(step.selectors);
	case `change`: return step.value;
	case `editableChange`: return step.text;
	case `editableInput`: return step.data;
	case `scroll`: return `x: ${step.x}, y: ${step.y}`;
	case `navigate`: return humanizeUrl(step.url);
	default: return undefined;
	}
}
