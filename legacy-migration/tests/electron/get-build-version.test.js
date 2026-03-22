import { describe, test, expect } from 'vitest';
import semver from 'semver';
import { getBuildVersion } from '../../src/scripts/get-build-version.js';

describe(`getBuildVersion`, () => {
	test(`return value is valid semver`, () => {
		const version = getBuildVersion();
		expect(semver.valid(version)).toBeTruthy();
	});

	test(`UTC: known UTC instant returns expected string`, () => {
		const date = new Date(`2026-02-08T04:26:23.000Z`);
		// Year: 2026 -> 26
		// Month: 2 -> 2
		// Build: (8 * 1440) + (4 * 60) + 26 = 11520 + 240 + 26 = 11786
		// Wait, math: 8 * 1440 = 11520. 4 * 60 = 240. 26 is the minutes? No, the minute is 26.
		// (8 * 1440) + (4 * 60) + 26 = 11786
		expect(getBuildVersion(date)).toBe(`26.2.11786`);
	});

	test(`no argument returns string of correct form`, () => {
		const version = getBuildVersion();
		expect(typeof version).toBe(`string`);
		expect(semver.valid(version)).toBeTruthy();
		const [major, minor, build] = version.split(`.`).map(Number);
		expect(major).toBeLessThan(256);
		expect(minor).toBeLessThan(256);
		expect(build).toBeLessThan(65536);
	});

	test(`edge case: single-digit month and day and midnight UTC`, () => {
		const date = new Date(`2026-01-01T00:00:00.000Z`);
		// 1 * 1440 + 0 + 0 = 1440
		expect(getBuildVersion(date)).toBe(`26.1.1440`);
	});

	test(`edge case: maximum values (Dec 31, 23:59:59)`, () => {
		const date = new Date(`2026-12-31T23:59:59.000Z`);
		const version = getBuildVersion(date);
		const [major, minor, build] = version.split(`.`).map(Number);
		expect(major).toBe(26);
		expect(minor).toBe(12);
		expect(build).toBe(31 * 1440 + 23 * 60 + 59); // 44640 + 1380 + 59 = 46079
		expect(build).toBeLessThan(65536);
	});

	test(`later date yields greater version`, () => {
		const date1 = new Date(`2026-02-08T04:26:23.000Z`);
		const date2 = new Date(`2026-02-08T04:27:23.000Z`); // 1 min later
		expect(semver.lt(getBuildVersion(date1), getBuildVersion(date2))).toBe(true);
	});
});
