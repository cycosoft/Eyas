import type { LabelString } from '@registry/primitives.js';



type AutofillEventListener = (event: Event) => void;

type AutofillListenersMap = {
	[key: string]: AutofillEventListener[] | undefined;
	mouseenter?: AutofillEventListener[];
	mouseleave?: AutofillEventListener[];
}

type MockElement = {
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

type AutofillListenersHolder = {
	listeners?: AutofillListenersMap;
};

export type MockElementWithListeners = MockElement & AutofillListenersHolder;
