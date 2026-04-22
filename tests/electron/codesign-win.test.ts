import { describe, it, expect, vi, beforeEach } from 'vitest';
import codesignWin from '@scripts/codesign-win.js';
import { exec } from 'node:child_process';
import type { ExecResult, ExecCallback, ExecCommand, ExecOutput } from '@registry/node-helpers.js';

// Mock child_process.exec
vi.mock(`node:child_process`, () => ({
	exec: vi.fn()
}));

import type * as Util from 'node:util';

// Mock util.promisify to return a function that calls the mocked exec
vi.mock(`node:util`, async importOriginal => {
	const actual = await importOriginal() as typeof Util;
	return {
		...actual,
		promisify: (fn: (...args: unknown[]) => unknown): ((...args: unknown[]) => unknown) => {
			if (fn === exec) {
				return (async (_cmd: ExecCommand): Promise<ExecResult> => {
					return fn(_cmd) as unknown as Promise<ExecResult>;
				}) as unknown as (...args: unknown[]) => unknown;
			}
			return actual.promisify(fn as never) as (...args: unknown[]) => unknown;
		}
	};
});

describe(`codesign-win`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.CERT_SKIP = `false`;
		process.env.CERT_DEBUG = `false`;
		process.env.CERT_VERBOSE = `false`;
	});

	it(`should call signtool with correct arguments`, async () => {
		vi.mocked(exec).mockImplementation(((_cmd: ExecCommand, cb: ExecCallback) => {
			if (cb) { cb(null, { stdout: `success` } as ExecOutput); }
			return { stdout: `success` } as unknown as typeof exec;
		}) as unknown as typeof exec);

		const config = {
			path: `C:\\path\\to\\app.exe`,
			hash: `sha256`
		};

		await codesignWin(config);

		expect(vi.mocked(exec)).toHaveBeenCalled();
		const command = vi.mocked(exec).mock.calls[0][0];
		expect(command).toContain(`signtool sign`);
		expect(command).toContain(`/n "Open Source Developer, Eric Higginson"`);
		expect(command).toContain(`/fd sha256`);
		expect(command).toContain(`/as`);
		expect(command).toContain(`/tr http://time.certum.pl/`);
		expect(command).toContain(`/td sha256`);
		expect(command).toContain(`"C:\\path\\to\\app.exe"`);
	});

	it(`should use /t and /v for non-sha256 hash`, async () => {
		vi.mocked(exec).mockImplementation(((_cmd: ExecCommand, cb: ExecCallback) => {
			if (cb) { cb(null, { stdout: `success` } as ExecOutput); }
			return { stdout: `success` } as unknown as typeof exec;
		}) as unknown as typeof exec);

		const config = {
			path: `C:\\path\\to\\app.exe`,
			hash: `sha1`
		};

		await codesignWin(config);

		expect(vi.mocked(exec)).toHaveBeenCalled();
		const command = vi.mocked(exec).mock.calls[0][0];
		expect(command).toContain(`/fd sha1`);
		expect(command).toContain(`/t http://time.certum.pl/`);
		expect(command).not.toContain(`/as`);
		expect(command).not.toContain(`/td sha256`);
	});

	it(`should skip signing if CERT_SKIP is true`, async () => {
		process.env.CERT_SKIP = `true`;
		const config = {
			path: `C:\\path\\to\\app.exe`,
			hash: `sha256`
		};

		await codesignWin(config);

		expect(vi.mocked(exec)).not.toHaveBeenCalled();
	});

	it(`should include /debug if CERT_DEBUG is true`, async () => {
		process.env.CERT_DEBUG = `true`;
		vi.mocked(exec).mockImplementation(((_cmd: ExecCommand, cb: ExecCallback) => {
			if (cb) { cb(null, { stdout: `success` } as ExecOutput); }
			return { stdout: `success` } as unknown as typeof exec;
		}) as unknown as typeof exec);

		const config = {
			path: `C:\\path\\to\\app.exe`,
			hash: `sha256`
		};

		await codesignWin(config);

		expect(vi.mocked(exec)).toHaveBeenCalled();
		const command = vi.mocked(exec).mock.calls[0][0];
		expect(command).toContain(`/debug`);
	});
});
