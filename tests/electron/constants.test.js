import { describe, test, expect } from 'vitest';
import { SETTINGS_DEFAULTS } from '../../src/scripts/constants.js';

describe(`SETTINGS_DEFAULTS`, () => {
	test(`env.alwaysChoose defaults to false`, () => {
		expect(SETTINGS_DEFAULTS.env.alwaysChoose).toBe(false);
	});

	test(`has an env bucket`, () => {
		expect(typeof SETTINGS_DEFAULTS.env).toBe(`object`);
	});
});
