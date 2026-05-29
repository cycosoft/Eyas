import type { LabelString } from '@registry/primitives.js';

export type MockDOMRect = {
	top: number;
	bottom: number;
	left: number;
	right: number;
	width: number;
	height: number;
};

export type MockInput = {
	value: LabelString;
	type: LabelString;
	tagName: LabelString;
	dispatchEvent: unknown;
	offsetWidth?: number;
	getBoundingClientRect?: () => MockDOMRect;
	addEventListener?: unknown;
	form?: unknown;
};

export type AutofillEventListener = (event: Event) => void;

export type AutofillListenersMap = {
	[key: string]: AutofillEventListener[] | undefined;
	mouseenter?: AutofillEventListener[];
	mouseleave?: AutofillEventListener[];
}

export type MockElement = {
	tag: LabelString;
	style: Record<LabelString, LabelString>;
	setAttribute: unknown;
	appendChild: unknown;
	addEventListener: unknown;
	remove: unknown;
	contains: unknown;
	src?: LabelString;
	innerHTML?: LabelString;
}

export type AutofillListenersHolder = {
	listeners?: AutofillListenersMap;
};

export type MockElementWithListeners = MockElement & AutofillListenersHolder;
