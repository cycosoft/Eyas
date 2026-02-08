import { describe, test, expect } from 'vitest';
import { getElectronBuilderConfig } from '../../src/scripts/electron-builder-config.js';

const basePaths = {
	icon: `/fake/build/eyas-assets/eyas-logo.png`,
	iconDbWin: `/fake/build/eyas-assets/eyas-db.ico`,
	iconDbMac: `/fake/build/eyas-assets/eyas-db.icns`,
	codesignWin: `/fake/src/scripts/codesign-win.js`
};

const baseOptions = {
	isDev: false,
	isInstaller: false,
	isMac: true,
	isWin: true,
	paths: basePaths,
	runnerName: `Eyas`,
	appleTeamId: ``,
	buildRoot: `/fake/.build`,
	runnersRoot: `/fake/.runners`
};

describe(`getElectronBuilderConfig`, () => {
	test(`mac.notarize is a boolean gated on appleTeamId`, () => {
		const configWithTeamId = getElectronBuilderConfig({
			...baseOptions,
			appleTeamId: `TEAM123`
		});
		expect(typeof configWithTeamId.mac.notarize).toBe(`boolean`);
		expect(configWithTeamId.mac.notarize).toBe(true);

		const configWithoutTeamId = getElectronBuilderConfig({
			...baseOptions,
			appleTeamId: ``
		});
		expect(typeof configWithoutTeamId.mac.notarize).toBe(`boolean`);
		expect(configWithoutTeamId.mac.notarize).toBe(false);
	});

	test(`win has no top-level sign property`, () => {
		const config = getElectronBuilderConfig({
			...baseOptions,
			isWin: true
		});
		expect(`sign` in config.win).toBe(false);
		expect(config.win.sign).toBeUndefined();
	});

	test(`win uses signtoolOptions.sign when not dev`, () => {
		const config = getElectronBuilderConfig({
			...baseOptions,
			isWin: true,
			isDev: false
		});
		expect(config.win.signtoolOptions).toBeDefined();
		expect(config.win.signtoolOptions.sign).toBe(basePaths.codesignWin);
	});

	test(`win has no signtoolOptions when dev`, () => {
		const config = getElectronBuilderConfig({
			...baseOptions,
			isWin: true,
			isDev: true
		});
		expect(config.win.signtoolOptions).toBeUndefined();
	});

	test(`mac target is array with pkg and zip when isInstaller and isMac`, () => {
		const config = getElectronBuilderConfig({
			...baseOptions,
			isInstaller: true,
			isMac: true
		});
		expect(Array.isArray(config.mac.target)).toBe(true);
		expect(config.mac.target).toContain(`pkg`);
		expect(config.mac.target).toContain(`zip`);
	});
});
