import { describe, test, expect } from 'vitest';
import { getElectronBuilderConfig } from '../../src/scripts/electron-builder-config.js';

const basePaths = {
	icon: `/fake/out/eyas-assets/eyas-logo.png`,
	iconDbWin: `/fake/out/eyas-assets/eyas-db.ico`,
	iconDbMac: `/fake/out/eyas-assets/eyas-db.icns`,
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
	buildRoot: `/fake/out`,
	runnersRoot: `/fake/.runners`
};

describe(`getElectronBuilderConfig`, () => {
	test(`mac.notarize is a boolean gated on appleTeamId`, () => {
		const configWithTeamId = getElectronBuilderConfig({
			...baseOptions,
			appleTeamId: `TEAM123`
		});
		expect(configWithTeamId.mac).toBeDefined();
		if (!configWithTeamId.mac) throw new Error(`mac is undefined`);
		expect(typeof configWithTeamId.mac.notarize).toBe(`boolean`);
		expect(configWithTeamId.mac.notarize).toBe(true);

		const configWithoutTeamId = getElectronBuilderConfig({
			...baseOptions,
			appleTeamId: ``
		});
		expect(configWithoutTeamId.mac).toBeDefined();
		if (!configWithoutTeamId.mac) throw new Error(`mac is undefined`);
		expect(typeof configWithoutTeamId.mac.notarize).toBe(`boolean`);
		expect(configWithoutTeamId.mac.notarize).toBe(false);
	});

	test(`win has no top-level sign property`, () => {
		const config = getElectronBuilderConfig({
			...baseOptions,
			isWin: true
		});
		expect(config.win).toBeDefined();
		if (!config.win) throw new Error(`win is undefined`);
		expect(`sign` in config.win).toBe(false);
		expect((config.win as Record<string, unknown>).sign).toBeUndefined();
	});

	test(`win uses signtoolOptions.sign when not dev`, () => {
		const config = getElectronBuilderConfig({
			...baseOptions,
			isWin: true,
			isDev: false
		});
		expect(config.win).toBeDefined();
		if (!config.win) throw new Error(`win is undefined`);
		expect(config.win.signtoolOptions).toBeDefined();
		expect(config.win.signtoolOptions?.sign).toBe(basePaths.codesignWin);
	});

	test(`win has no signtoolOptions when dev`, () => {
		const config = getElectronBuilderConfig({
			...baseOptions,
			isWin: true,
			isDev: true
		});
		expect(config.win).toBeDefined();
		if (!config.win) throw new Error(`win is undefined`);
		expect(config.win.signtoolOptions).toBeUndefined();
	});

	test(`mac target is array with pkg and zip when isInstaller and isMac`, () => {
		const config = getElectronBuilderConfig({
			...baseOptions,
			isInstaller: true,
			isMac: true
		});
		expect(config.mac).toBeDefined();
		if (!config.mac) throw new Error(`mac is undefined`);
		expect(Array.isArray(config.mac.target)).toBe(true);
		expect(config.mac.target).toContain(`pkg`);
		expect(config.mac.target).toContain(`zip`);
	});

	test(`artifactName includes -mac suffix when isInstaller and isMac`, () => {
		const runnerName = `EyasInstaller`;
		const config = getElectronBuilderConfig({
			...baseOptions,
			isInstaller: true,
			isMac: true,
			isWin: false,
			runnerName
		});
		expect(config.artifactName).toBe(`${runnerName}-mac.\${ext}`);
	});

	test(`artifactName includes -win suffix when isInstaller and isWin`, () => {
		const runnerName = `EyasInstaller`;
		const config = getElectronBuilderConfig({
			...baseOptions,
			isInstaller: true,
			isMac: false,
			isWin: true,
			runnerName
		});
		expect(config.artifactName).toBe(`${runnerName}-win.\${ext}`);
	});

	test(`nsis configuration is correct when isWin is true`, () => {
		const config = getElectronBuilderConfig({
			...baseOptions,
			isWin: true
		});
		expect(config.nsis).toBeDefined();
		if (!config.nsis) throw new Error(`nsis is undefined`);
		expect(config.nsis.oneClick).toBe(false);
		expect(config.nsis.allowToChangeInstallationDirectory).toBe(true);
		expect(config.nsis.createDesktopShortcut).toBe(`always`);
		expect(config.nsis.createStartMenuShortcut).toBe(true);
		expect(config.nsis.runAfterFinish).toBe(false);
	});
});

