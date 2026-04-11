import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { bumpBuildVersion } from '../../src/scripts/bump-build-version.js';

describe(`bumpBuildVersion`, () => {
	let tempDir;
	let pkgPath;
	let changelogPath;
	let execSyncMock;

	vi.mock(`child_process`, async () => {
		const actual = await vi.importActual(`child_process`);
		return {
			...actual,
			execSync: (...args) => {
				if (execSyncMock) return execSyncMock(...args);
				return actual.execSync(...args);
			}
		};
	});

	beforeEach(async () => {
		tempDir = path.join(os.tmpdir(), `eyas-test-${Math.random().toString(36).slice(2)}`);
		await fs.ensureDir(tempDir);

		pkgPath = path.join(tempDir, `package.json`);
		await fs.writeJson(pkgPath, { name: `test-pkg`, version: `1.0.0` }, { spaces: 2 });

		changelogPath = path.join(tempDir, `CHANGELOG.json`);
		await fs.writeJson(changelogPath, [{ version: `1.0.0`, items: [] }], { spaces: 2 });

		execSyncMock = vi.fn().mockReturnValue(`v1.0.0`);

		vi.spyOn(console, `log`).mockImplementation(() => { });
	});

	afterEach(async () => {
		await fs.remove(tempDir);
		vi.restoreAllMocks();
	});

	test(`updates version in package.json`, async () => {
		const newVersion = await bumpBuildVersion(pkgPath, changelogPath);
		const pkg = await fs.readJson(pkgPath);

		expect(pkg.version).toBe(newVersion);
		expect(newVersion).toMatch(/^\d+\.\d+\.\d+$/);
	});

	test(`updates version in CHANGELOG.json`, async () => {
		const newVersion = await bumpBuildVersion(pkgPath, changelogPath);
		const changelog = await fs.readJson(changelogPath);

		expect(changelog[0].version).toBe(newVersion);
	});

	test(`logs tagging instructions`, async () => {
		const newVersion = await bumpBuildVersion(pkgPath, changelogPath);

		expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`Version updated to: ${newVersion}`));
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`git tag -a v${newVersion} -m "v${newVersion}"`));
	});
});
