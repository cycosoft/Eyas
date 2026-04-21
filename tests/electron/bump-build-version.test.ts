import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { bumpBuildVersion } from '@scripts/bump-build-version.js';

import type * as ChildProcess from 'child_process';
import { execSync } from 'child_process';
import type { Mock } from 'vitest';
import type { FilePath } from '@registry/primitives.js';

vi.mock(`child_process`, async () => {
	const actual = await vi.importActual(`child_process`) as typeof ChildProcess;
	return {
		...actual,
		execSync: vi.fn()
	};
});

describe(`bumpBuildVersion`, () => {
	let tempDir: FilePath;
	let pkgPath: FilePath;
	let changelogPath: FilePath;

	beforeEach(async () => {
		tempDir = path.join(os.tmpdir(), `eyas-test-${Math.random().toString(36).slice(2)}`);
		await fs.ensureDir(tempDir);

		pkgPath = path.join(tempDir, `package.json`);
		await fs.writeJson(pkgPath, { name: `test-pkg`, version: `1.0.0` }, { spaces: 2 });

		changelogPath = path.join(tempDir, `CHANGELOG.json`);
		await fs.writeJson(changelogPath, [{ version: `1.0.0`, items: [] }], { spaces: 2 });

		(execSync as Mock).mockReturnValue(`v1.0.0`);

		vi.spyOn(console, `log`).mockImplementation(() => { });
	});

	afterEach(async () => {
		await fs.remove(tempDir);
		(execSync as Mock).mockReset();
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
