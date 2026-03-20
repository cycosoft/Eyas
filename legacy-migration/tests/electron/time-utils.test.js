import { describe, it, expect } from 'vitest';
import { formatDuration } from '../../src/scripts/time-utils.js';

describe(`time-utils`, () => {
	describe(`formatDuration`, () => {
		it(`should format seconds correctly`, () => {
			expect(formatDuration(5000)).toBe(`5s`);
			expect(formatDuration(59000)).toBe(`59s`);
		});

		it(`should format minutes correctly`, () => {
			expect(formatDuration(60000)).toBe(`1m`);
			expect(formatDuration(1800000)).toBe(`30m`);
		});

		it(`should format hours correctly`, () => {
			expect(formatDuration(3600000)).toBe(`1h`);
			expect(formatDuration(7200000)).toBe(`2h`);
		});

		it(`should handle mixed units (rounding down)`, () => {
			expect(formatDuration(65000)).toBe(`1m`);
			expect(formatDuration(3660000)).toBe(`1h`);
		});

		it(`should handle small values`, () => {
			expect(formatDuration(500)).toBe(`0s`);
		});
	});
});
