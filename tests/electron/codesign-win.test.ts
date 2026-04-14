import { describe, it, expect, vi, beforeEach } from 'vitest';
import codesignWin from '../../src/scripts/codesign-win.js';
import { exec } from 'node:child_process';

// Mock child_process.exec
vi.mock(`node:child_process`, () => ({
	exec: vi.fn()
}));

// Mock util.promisify to return a function that calls the mocked exec
vi.mock(`node:util`, async importOriginal => {
	const actual = await importOriginal();
	return {
		...actual,
		promisify: fn => {
			if (fn === exec) {
				return async cmd => {
					return fn(cmd);
				};
			}
			return actual.promisify(fn);
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
		exec.mockImplementation((cmd, cb) => {
			if (cb) { cb(null, { stdout: `success` }); }
			return { stdout: `success` };
		});

		const config = {
			path: `C:\\path\\to\\app.exe`,
			hash: `sha256`
		};

		await codesignWin(config);

		expect(exec).toHaveBeenCalled();
		const command = exec.mock.calls[0][0];
		expect(command).toContain(`signtool sign`);
		expect(command).toContain(`/n "Open Source Developer, Eric Higginson"`);
		expect(command).toContain(`/fd sha256`);
		expect(command).toContain(`/as`);
		expect(command).toContain(`/tr http://time.certum.pl/`);
		expect(command).toContain(`/td sha256`);
		expect(command).toContain(`"C:\\path\\to\\app.exe"`);
	});

	it(`should use /t and /v for non-sha256 hash`, async () => {
		exec.mockImplementation((cmd, cb) => {
			if (cb) { cb(null, { stdout: `success` }); }
			return { stdout: `success` };
		});

		const config = {
			path: `C:\\path\\to\\app.exe`,
			hash: `sha1`
		};

		await codesignWin(config);

		expect(exec).toHaveBeenCalled();
		const command = exec.mock.calls[0][0];
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

		expect(exec).not.toHaveBeenCalled();
	});

	it(`should include /debug if CERT_DEBUG is true`, async () => {
		process.env.CERT_DEBUG = `true`;
		exec.mockImplementation((cmd, cb) => {
			if (cb) { cb(null, { stdout: `success` }); }
			return { stdout: `success` };
		});

		const config = {
			path: `C:\\path\\to\\app.exe`,
			hash: `sha256`
		};

		await codesignWin(config);

		expect(exec).toHaveBeenCalled();
		const command = exec.mock.calls[0][0];
		expect(command).toContain(`/debug`);
	});
});
