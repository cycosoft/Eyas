import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { remove, readJson } from 'fs-extra';

// We use require() so we can re-require after resetting storage path
const service = require(`../../src/eyas-core/settings-service.js`);

// ─── helpers ──────────────────────────────────────────────────────────────────

let tmpFile;

beforeEach(() => {
	// Each test gets its own unique temp file so tests don't interfere
	tmpFile = join(tmpdir(), `eyas-settings-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
	service._setStoragePath(tmpFile);
});

afterEach(async () => {
	// Clean up the temp file
	await remove(tmpFile).catch(() => { });
});

// ─── load / save round-trip ───────────────────────────────────────────────────

describe(`load / save round-trip`, () => {
	test(`load() initialises empty structure when file does not exist`, async () => {
		await service.load();
		expect(service.getAppSettings()).toEqual({});
		expect(service.getProjectSettings(`any`)).toEqual({});
	});

	test(`load() restores previously saved data`, async () => {
		await service.load();
		service.set(`env.alwaysChoose`, true, `proj-1`);
		await service.save();

		// reload from the same path
		await service.load();
		expect(service.getProjectSettings(`proj-1`)).toMatchObject({ env: { alwaysChoose: true } });
	});

	test(`save() writes a valid JSON file readable by readJson`, async () => {
		await service.load();
		service.set(`env.alwaysChoose`, false);
		await service.save();

		const written = await readJson(tmpFile);
		expect(written.app.env.alwaysChoose).toBe(false);
	});
});

// ─── get() cascade ────────────────────────────────────────────────────────────

describe(`get() cascade`, () => {
	beforeEach(async () => {
		await service.load();
	});

	test(`returns project-level value when defined`, () => {
		service.set(`env.alwaysChoose`, true, `proj-a`);
		service.set(`env.alwaysChoose`, false); // app level
		expect(service.get(`env.alwaysChoose`, `proj-a`)).toBe(true);
	});

	test(`falls back to app-level value when project value is undefined`, () => {
		service.set(`env.alwaysChoose`, true); // app level only
		expect(service.get(`env.alwaysChoose`, `proj-missing`)).toBe(true);
	});

	test(`falls back to SETTINGS_DEFAULTS when both project and app are undefined`, () => {
		// nothing set — should return the default (false)
		expect(service.get(`env.alwaysChoose`, `proj-missing`)).toBe(false);
	});

	test(`returns SETTINGS_DEFAULTS when no projectId provided and app is undefined`, () => {
		expect(service.get(`env.alwaysChoose`)).toBe(false);
	});

	test(`returns undefined for an unknown key path`, () => {
		expect(service.get(`nonexistent.key`, `proj-x`)).toBeUndefined();
	});
});

// ─── set() ────────────────────────────────────────────────────────────────────

describe(`set()`, () => {
	beforeEach(async () => {
		await service.load();
	});

	test(`set at app level stores value in app bucket`, () => {
		service.set(`env.alwaysChoose`, true);
		expect(service.getAppSettings()).toMatchObject({ env: { alwaysChoose: true } });
	});

	test(`set at project level stores value under correct projectId`, () => {
		service.set(`env.alwaysChoose`, true, `proj-b`);
		expect(service.getProjectSettings(`proj-b`)).toMatchObject({ env: { alwaysChoose: true } });
	});

	test(`set does not clobber unrelated keys`, () => {
		service.set(`env.alwaysChoose`, true, `proj-c`);
		service.set(`env.lastChoiceHash`, `abc123`, `proj-c`);
		const settings = service.getProjectSettings(`proj-c`);
		expect(settings.env.alwaysChoose).toBe(true);
		expect(settings.env.lastChoiceHash).toBe(`abc123`);
	});

	test(`set to different projectIds does not cross-contaminate`, () => {
		service.set(`env.alwaysChoose`, true, `proj-d`);
		service.set(`env.alwaysChoose`, false, `proj-e`);
		expect(service.get(`env.alwaysChoose`, `proj-d`)).toBe(true);
		expect(service.get(`env.alwaysChoose`, `proj-e`)).toBe(false);
	});
});

// ─── getProjectSettings() ─────────────────────────────────────────────────────

describe(`getProjectSettings()`, () => {
	beforeEach(async () => {
		await service.load();
	});

	test(`returns empty object when projectId not found`, () => {
		expect(service.getProjectSettings(`unknown-project`)).toEqual({});
	});

	test(`returns stored data when projectId is found`, () => {
		service.set(`env.alwaysChoose`, true, `proj-f`);
		expect(service.getProjectSettings(`proj-f`)).toMatchObject({ env: { alwaysChoose: true } });
	});
});
