import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { compileRunners } from '../../src/scripts/compile-runners.js';
import builder from 'electron-builder';
import fs from 'fs-extra';
import { exec } from 'child_process';
import { getElectronBuilderConfig } from '../../src/scripts/electron-builder-config.js';

// Mock the modules
vi.mock(`electron-builder`, () => ({
	default: {
		build: vi.fn().mockResolvedValue([`EyasInstaller-win.exe`, `Eyas.zip`]),
		Platform: {
			WINDOWS: { name: `win` },
			MAC: { name: `mac` }
		},
		createTargets: vi.fn(targets => targets)
	}
}));

vi.mock(`fs-extra`, () => ({
	default: {
		copy: vi.fn().mockResolvedValue(undefined)
	}
}));

vi.mock(`child_process`, () => ({
	exec: vi.fn()
}));

vi.mock(`../../src/scripts/electron-builder-config.js`, () => ({
	getElectronBuilderConfig: vi.fn().mockReturnValue({})
}));

describe(`compileRunners`, () => {
	const originalEnv = process.env;
	const originalPlatform = process.platform;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv };
		// Reset to a default platform
		Object.defineProperty(process, `platform`, {
			value: `win32`,
			writable: true
		});
	});

	afterEach(() => {
		process.env = originalEnv;
		Object.defineProperty(process, `platform`, {
			value: originalPlatform,
			writable: true
		});
	});

	test(`should call builder.build with correct targets for Windows`, async () => {
		Object.defineProperty(process, `platform`, { value: `win32` });
		await compileRunners();

		expect(builder.build).toHaveBeenCalled();
		const buildArgs = vi.mocked(builder.build).mock.calls[0][0];
		if (!buildArgs) throw new Error(`buildArgs is undefined`);
		expect(buildArgs.targets).toContain(builder.Platform.WINDOWS);
	});

	test(`should call builder.build with correct targets for Mac`, async () => {
		Object.defineProperty(process, `platform`, { value: `darwin` });
		await compileRunners();

		expect(builder.build).toHaveBeenCalled();
		const buildArgs = vi.mocked(builder.build).mock.calls[0][0];
		if (!buildArgs) throw new Error(`buildArgs is undefined`);
		expect(buildArgs.targets).toContain(builder.Platform.MAC);
	});

	test(`should copy .exe files to dist folder`, async () => {
		Object.defineProperty(process, `platform`, { value: `win32` });
		vi.mocked(builder.build).mockResolvedValue([`C:/path/to/app.exe`]);

		await compileRunners();

		expect(fs.copy).toHaveBeenCalledWith(
			`C:/path/to/app.exe`,
			expect.stringContaining(`Start.exe`)
		);
	});

	test(`should not copy non-exe files`, async () => {
		Object.defineProperty(process, `platform`, { value: `win32` });
		vi.mocked(builder.build).mockResolvedValue([`C:/path/to/app.zip`]);

		await compileRunners();

		expect(fs.copy).not.toHaveBeenCalled();
	});

	test(`should execute open folder command if EYAS_OPEN_RUNNERS is true`, async () => {
		process.env.EYAS_OPEN_RUNNERS = `true`;
		Object.defineProperty(process, `platform`, { value: `win32` });

		await compileRunners();

		expect(exec).toHaveBeenCalledWith(expect.stringContaining(`explorer`));
	});

	test(`should set publish to 'always' when PUBLISH_TYPE is 'installer'`, async () => {
		process.env.PUBLISH_TYPE = `installer`;
		await compileRunners();

		expect(builder.build).toHaveBeenCalled();
		const buildArgs = vi.mocked(builder.build).mock.calls[0][0];
		if (!buildArgs) throw new Error(`buildArgs is undefined`);
		expect(buildArgs.publish).toBe(`always`);
	});

	test(`should set publish to 'never' when PUBLISH_TYPE is not 'installer'`, async () => {
		process.env.PUBLISH_TYPE = `something-else`;
		await compileRunners();

		expect(builder.build).toHaveBeenCalled();
		const buildArgs = vi.mocked(builder.build).mock.calls[0][0];
		if (!buildArgs) throw new Error(`buildArgs is undefined`);
		expect(buildArgs.publish).toBe(`never`);
	});

	test(`should execute 'open' command for Mac if EYAS_OPEN_RUNNERS is true`, async () => {
		process.env.EYAS_OPEN_RUNNERS = `true`;
		Object.defineProperty(process, `platform`, { value: `darwin` });

		await compileRunners();

		expect(exec).toHaveBeenCalledWith(expect.stringContaining(`open`));
	});

	test(`should pass environment variables to getElectronBuilderConfig`, async () => {
		process.env.APPLE_TEAM_ID = `TEAM123`;
		process.env.PROVISIONING_PROFILE_PATH = `/path/to/profile`;

		await compileRunners();

		expect(getElectronBuilderConfig).toHaveBeenCalledWith(expect.objectContaining({
			appleTeamId: `TEAM123`,
			provisioningProfile: `/path/to/profile`
		}));
	});
});
