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
		expect(getBuildVersion(date)).toBe(`2026.208.42623`);
	});

	test(`no argument returns string of correct form`, () => {
		const version = getBuildVersion();
		expect(typeof version).toBe(`string`);
		expect(semver.valid(version)).toBeTruthy();
	});

	test(`edge case: single-digit month and day and midnight UTC`, () => {
		const date = new Date(`2026-01-01T00:00:00.000Z`);
		expect(getBuildVersion(date)).toBe(`2026.101.0`);
	});

	test(`later date yields greater version`, () => {
		const date1 = new Date(`2026-02-08T04:26:23.000Z`);
		const date2 = new Date(`2026-02-08T04:26:24.000Z`);
		expect(semver.lt(getBuildVersion(date1), getBuildVersion(date2))).toBe(true);
	});
});
