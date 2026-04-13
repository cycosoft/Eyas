import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { compileRunners } from '../../src/scripts/compile-runners.js';
import builder from 'electron-builder';
import fs from 'fs-extra';
import { exec } from 'child_process';

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
		copy: vi.fn().mockResolvedValue()
	}
}));

vi.mock(`child_process`, () => ({
	exec: vi.fn()
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
		expect(buildArgs.targets).toContain(builder.Platform.WINDOWS);
	});

	test(`should call builder.build with correct targets for Mac`, async () => {
		Object.defineProperty(process, `platform`, { value: `darwin` });
		await compileRunners();

		expect(builder.build).toHaveBeenCalled();
		const buildArgs = vi.mocked(builder.build).mock.calls[0][0];
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
});
