import { describe, test, expect } from 'vitest';
import { formatDisplayUrl, formatTimestamp, calculateCountdownText, getExtensionLabel, checkCanExtend } from '@interface/components/TestServerActiveModal.utils.js';
import { TEST_SERVER_SESSION_DURATION_MS } from '@scripts/constants.js';

describe(`TestServerActiveModal.utils`, () => {
	describe(`formatDisplayUrl`, () => {
		test(`returns empty string if domain is empty`, () => {
			expect(formatDisplayUrl(``)).toBe(``);
		});

		test(`hides port 80 for http`, () => {
			expect(formatDisplayUrl(`http://localhost:80`)).toBe(`http://localhost`);
		});

		test(`hides port 443 for https`, () => {
			expect(formatDisplayUrl(`https://localhost:443`)).toBe(`https://localhost`);
		});

		test(`hides port 90`, () => {
			expect(formatDisplayUrl(`http://localhost:90`)).toBe(`http://localhost`);
		});

		test(`keeps other ports (e.g. 8080)`, () => {
			expect(formatDisplayUrl(`http://localhost:8080`)).toBe(`http://localhost:8080`);
		});

		test(`removes trailing slash`, () => {
			expect(formatDisplayUrl(`http://localhost:80/`)).toBe(`http://localhost`);
		});

		test(`returns original domain if URL parsing fails`, () => {
			expect(formatDisplayUrl(`not-a-url`)).toBe(`not-a-url`);
		});
	});

	describe(`formatTimestamp`, () => {
		test(`returns empty string if timestamp is null`, () => {
			expect(formatTimestamp(null)).toBe(``);
		});

		test(`formats timestamp to locale time string`, () => {
			const date = new Date(2026, 3, 19, 14, 30); // 2:30 PM
			const result = formatTimestamp(date.getTime());
			expect(result).toMatch(/2:30/);
			expect(result).toMatch(/pm/);
		});
	});

	describe(`calculateCountdownText`, () => {
		test(`returns empty string if endTime is null`, () => {
			expect(calculateCountdownText(null, Date.now())).toBe(``);
		});

		test(`correctly calculates minutes and seconds`, () => {
			const now = Date.now();
			const endTime = now + (5 * 60 * 1000) + (30 * 1000); // 5m 30s
			expect(calculateCountdownText(endTime, now)).toBe(`5m30s`);
		});

		test(`returns 0m0s if endTime is in the past`, () => {
			const now = Date.now();
			const endTime = now - 1000;
			expect(calculateCountdownText(endTime, now)).toBe(`0m0s`);
		});
	});

	describe(`getExtensionLabel`, () => {
		test(`returns formatted minutes if duration is multiple of 60s`, () => {
			// TEST_SERVER_SESSION_DURATION_MS is 30m by default
			expect(getExtensionLabel()).toBe(`30m`);
		});
	});

	describe(`checkCanExtend`, () => {
		const now = 10000;

		test(`returns true if isExpired is true`, () => {
			expect(checkCanExtend(true, null, now)).toBe(true);
		});

		test(`returns false if endTime is null`, () => {
			expect(checkCanExtend(false, null, now)).toBe(false);
		});

		test(`returns true if remaining time is less than default duration`, () => {
			const endTime = now + TEST_SERVER_SESSION_DURATION_MS - 1000;
			expect(checkCanExtend(false, endTime, now)).toBe(true);
		});

		test(`returns false if remaining time is greater than or equal to default duration`, () => {
			const endTime = now + TEST_SERVER_SESSION_DURATION_MS + 1000;
			expect(checkCanExtend(false, endTime, now)).toBe(false);
		});
	});
});
