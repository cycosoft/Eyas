import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { bumpBuildVersion } from '../../src/scripts/bump-build-version.js';

describe(`bumpBuildVersion`, () => {
	let tempDir;
	let pkgPath;

	beforeEach(async () => {
		tempDir = path.join(os.tmpdir(), `eyas-test-${Math.random().toString(36).slice(2)}`);
		await fs.ensureDir(tempDir);
		pkgPath = path.join(tempDir, `package.json`);
		await fs.writeJson(pkgPath, { name: `test-pkg`, version: `1.0.0` }, { spaces: 2 });
		vi.spyOn(console, `log`).mockImplementation(() => { });
	});

	afterEach(async () => {
		await fs.remove(tempDir);
		vi.restoreAllMocks();
	});

	test(`updates version in package.json`, async () => {
		const newVersion = await bumpBuildVersion(pkgPath);
		const pkg = await fs.readJson(pkgPath);

		expect(pkg.version).toBe(newVersion);
		expect(newVersion).toMatch(/^\d+\.\d+\.\d+$/);
	});

	test(`logs tagging instructions`, async () => {
		const newVersion = await bumpBuildVersion(pkgPath);

		expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`Version updated to: ${newVersion}`));
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`git tag -a v${newVersion} -m "v${newVersion}"`));
	});
});
