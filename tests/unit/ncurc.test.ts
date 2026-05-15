import { describe, it, expect } from 'vitest';
// @ts-expect-error - .ncurc.js is imported via alias
import { _getMajorVersion, _filterResults } from '@root/.ncurc.js';

describe(`ncurc.js config`, () => {
	it(`should correctly extract major version numbers`, () => {
		expect(_getMajorVersion(`^5.0.0`)).toBe(5);
		expect(_getMajorVersion(`6.0.0-beta.1`)).toBe(6);
		expect(_getMajorVersion(`8.0.11`)).toBe(8);
		expect(_getMajorVersion(`7.3.2`)).toBe(7);
		expect(_getMajorVersion(``)).toBe(0);
	});

	it(`should allow non-electron/vite packages to pass through`, () => {
		expect(_filterResults(`lodash`, { currentVersion: `^4.17.21`, upgradedVersion: `4.18.0` })).toBe(true);
	});

	it(`should reject electron version 42.0.0 specifically`, () => {
		expect(_filterResults(`electron`, { currentVersion: `^41.5.0`, upgradedVersion: `42.0.0` })).toBe(false);
	});

	it(`should allow electron version 42.0.1 (not 42.0.0)`, () => {
		expect(_filterResults(`electron`, { currentVersion: `^41.5.0`, upgradedVersion: `42.0.1` })).toBe(true);
	});

	it(`should allow general packages (non-electron) to update to stable major ending in .0.0`, () => {
		// Non-electron packages should NOT be blocked from updating to .0.0
		expect(_filterResults(`lodash`, { currentVersion: `^4.17.21`, upgradedVersion: `5.0.0` })).toBe(true);
		expect(_filterResults(`lodash`, { currentVersion: `^4.17.21`, upgradedVersion: `12.0.0` })).toBe(true);
	});

	it(`should reject electron package from updating to any stable major ending in .0.0`, () => {
		// Electron packages specifically SHOULD be blocked from updating to .0.0
		expect(_filterResults(`electron`, { currentVersion: `^41.5.0`, upgradedVersion: `43.0.0` })).toBe(false);
	});

	it(`should allow major versions that are not .0.0 (like 5.0.1)`, () => {
		expect(_filterResults(`lodash`, { currentVersion: `^4.17.21`, upgradedVersion: `5.0.1` })).toBe(true);
	});

	it(`should allow vite to update below 8.x when electron-vite is 5.x`, () => {
		const context = {
			packageJsonPath: `dummy-non-existent-path`,
			mockLatestElectronVite: `5.0.0`
		};
		// Vite upgrading to 7.3.2 (which is < 8) should be allowed
		expect(_filterResults(`vite`, { currentVersion: `^7.0.0`, upgradedVersion: `7.3.2` }, context)).toBe(true);
	});

	it(`should reject vite updates to 8.x when electron-vite is 5.x both in package.json and registry`, () => {
		const context = {
			packageJsonPath: `dummy-non-existent-path`,
			mockLatestElectronVite: `5.0.0`
		};
		// Vite upgrading to 8.0.11 should be rejected
		expect(_filterResults(`vite`, { currentVersion: `^7.0.0`, upgradedVersion: `8.0.11` }, context)).toBe(false);
	});

	it(`should allow vite updates to 8.x when electron-vite is 6.x in registry`, () => {
		const context = {
			packageJsonPath: `dummy-non-existent-path`,
			mockLatestElectronVite: `6.0.0`
		};
		// Vite upgrading to 8.0.11 should be allowed because electron-vite 6.x is available in registry
		expect(_filterResults(`vite`, { currentVersion: `^7.0.0`, upgradedVersion: `8.0.11` }, context)).toBe(true);
	});
});
