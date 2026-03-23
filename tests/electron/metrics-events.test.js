import { describe, test, expect } from 'vitest';
import { MP_EVENTS } from '../../src/eyas-core/metrics-events.js';

describe(`MP_EVENTS`, () => {
	test(`ui.modalBackgroundContentViewed is "Modal Background Content Viewed"`, () => {
		expect(MP_EVENTS.ui.modalBackgroundContentViewed).toBe(`Modal Background Content Viewed`);
	});

	test(`core events are unchanged`, () => {
		expect(MP_EVENTS.core.launch).toBe(`App Launch`);
		expect(MP_EVENTS.core.exit).toBe(`App Exit`);
	});
});
