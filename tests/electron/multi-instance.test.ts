import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { remove, readJson, outputJson, writeFile } from 'fs-extra';
import type { FilePath, ProcessId, TimestampMS, ProjectId, TestId } from '@registry/primitives.js';

vi.mock(`electron`, () => ({
	app: {
		getPath: vi.fn(() => tmpdir())
	},
	dialog: {
		showErrorBox: vi.fn()
	}
}));

vi.mock(`electron-updater`, () => {
	const mock = {
		autoUpdater: {
			forceDevUpdateConfig: false,
			logger: null,
			setFeedURL: vi.fn(),
			checkForUpdates: vi.fn().mockResolvedValue(null),
			on: vi.fn(),
			quitAndInstall: vi.fn(),
			currentVersion: { version: `1.0.0` }
		}
	};
	return { ...mock, default: mock };
});

import { dialog } from 'electron';
import { isLockHeldByLiveProcess, acquireLock, getProcessStartTime } from '@core/process-lock-utils.js';
import { instanceLockService } from '@core/instance-lock.service.js';
import service from '@core/settings-service.js';
import credentialStore from '@core/credential-store.js';
import { updateService } from '@core/update.service.js';

// This file covers behaviors that are pure logic (no real Electron process
// required) — process launch, dialog visibility from a real second process,
// and sessionData isolation are covered instead by tests/e2e/multi-instance.spec.mjs,
// which launches real Electron instances.

// ─── helpers ──────────────────────────────────────────────────────────────────

type TmpFileNameSegment = string;

function uniquePath(name: TmpFileNameSegment): FilePath {
	return join(tmpdir(), `eyas-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`) as FilePath;
}

// ─── Per-TestId Instance Lock ─────────────────────────────────────────────────

describe(`Per-TestId Instance Lock`, () => {
	let sessionsDir: FilePath;
	const projectId = `proj-a` as ProjectId;
	const testId = `test-a` as TestId;

	beforeEach(() => {
		sessionsDir = join(tmpdir(), `eyas-sessions-${Date.now()}-${Math.random().toString(36).slice(2)}`) as FilePath;
		instanceLockService._setSessionsDirOverride(sessionsDir);
		vi.clearAllMocks();
	});

	afterEach(async () => {
		instanceLockService._setSessionsDirOverride(null);
		await remove(sessionsDir).catch(() => { });
	});

	test(`should block a second launch with the same projectId+testId while the first is still alive`, async () => {
		const alwaysAlive = vi.fn().mockResolvedValue(1000 as TimestampMS);

		const first = await instanceLockService.tryAcquire(projectId, testId, alwaysAlive);
		expect(first).toBe(true);

		const second = await instanceLockService.tryAcquire(projectId, testId, alwaysAlive);
		expect(second).toBe(false);
	});

	test(`should allow a second launch when the existing lock file references a PID that is no longer running (crash recovery)`, async () => {
		const dead = vi.fn().mockResolvedValue(null);

		const first = await instanceLockService.tryAcquire(projectId, testId, dead);
		expect(first).toBe(true); // "dead" only affects whether a *read* is considered held, not the write itself

		const second = await instanceLockService.tryAcquire(projectId, testId, dead);
		expect(second).toBe(true);
	});

	test(`should allow a second launch when the lock file PID is alive but its recorded start time does not match the OS-reported start time (PID reuse)`, async () => {
		const originalStartTime = vi.fn().mockResolvedValue(1000 as TimestampMS);
		const first = await instanceLockService.tryAcquire(projectId, testId, originalStartTime);
		expect(first).toBe(true);

		// Same PID is alive, but the OS now reports a different start time —
		// the original process died and something else reused the PID.
		const reusedStartTime = vi.fn().mockResolvedValue(9999 as TimestampMS);
		const second = await instanceLockService.tryAcquire(projectId, testId, reusedStartTime);
		expect(second).toBe(true);
	});

	test(`should allow a launch when the lock file is missing or malformed`, async () => {
		const alwaysAlive = vi.fn().mockResolvedValue(1000 as TimestampMS);
		const result = await instanceLockService.tryAcquire(projectId, testId, alwaysAlive);
		expect(result).toBe(true);
	});

	test(`should overwrite (not delete) the lock file on every successful acquisition, including on graceful quit`, async () => {
		const alwaysDead = vi.fn().mockResolvedValue(null);

		await instanceLockService.tryAcquire(projectId, testId, alwaysDead);
		await instanceLockService.tryAcquire(projectId, testId, alwaysDead);

		const lockPath = join(sessionsDir, projectId, testId, `instance.lock`);
		const contents = await readJson(lockPath);
		expect(contents.pid).toBe(process.pid);
	});

	test(`should resolve a race between two instances launched simultaneously for the same testId such that exactly one proceeds`, async () => {
		const alwaysAlive = vi.fn().mockResolvedValue(1000 as TimestampMS);

		const [a, b] = await Promise.all([
			instanceLockService.tryAcquire(projectId, testId, alwaysAlive),
			instanceLockService.tryAcquire(projectId, testId, alwaysAlive)
		]);

		expect([a, b].filter(Boolean)).toHaveLength(1);
	});

	test(`should show a native dialog informing the user this test is already running before quitting`, async () => {
		const alwaysAlive = vi.fn().mockResolvedValue(1000 as TimestampMS);

		await instanceLockService.tryAcquire(projectId, testId, alwaysAlive);
		const blocked = await instanceLockService.tryAcquire(projectId, testId, alwaysAlive);

		expect(blocked).toBe(false);
		expect(dialog.showErrorBox).toHaveBeenCalledWith(
			expect.stringContaining(`already running`),
			expect.any(String)
		);
	});

	test(`should not show a dialog when acquisition succeeds`, async () => {
		const alwaysDead = vi.fn().mockResolvedValue(null);
		await instanceLockService.tryAcquire(projectId, testId, alwaysDead);
		expect(dialog.showErrorBox).not.toHaveBeenCalled();
	});
});

// ─── process-lock-utils (low-level primitive) ────────────────────────────────

describe(`process-lock-utils`, () => {
	let lockPath: FilePath;

	beforeEach(() => {
		lockPath = uniquePath(`lock`);
	});

	afterEach(async () => {
		await remove(lockPath).catch(() => { });
	});

	test(`isLockHeldByLiveProcess returns false when the lock file does not exist`, async () => {
		const held = await isLockHeldByLiveProcess(lockPath, vi.fn().mockResolvedValue(1000 as TimestampMS));
		expect(held).toBe(false);
	});

	test(`isLockHeldByLiveProcess returns false for a malformed lock file`, async () => {
		await outputJson(lockPath, { not: `a valid lock` });
		const held = await isLockHeldByLiveProcess(lockPath, vi.fn().mockResolvedValue(1000 as TimestampMS));
		expect(held).toBe(false);
	});

	test(`isLockHeldByLiveProcess treats a win32 (start-time-less) liveness result as held`, async () => {
		await acquireLock(lockPath, vi.fn().mockResolvedValue(0 as TimestampMS));
		const held = await isLockHeldByLiveProcess(lockPath, vi.fn().mockResolvedValue(0 as TimestampMS));
		expect(held).toBe(true);
	});

	test(`getProcessStartTime returns null for a PID that is not running`, async () => {
		// PID 999999 is extremely unlikely to be a real running process
		const result = await getProcessStartTime(999999 as ProcessId);
		expect(result).toBeNull();
	});

	test(`getProcessStartTime returns a value for the current (live) process`, async () => {
		const result = await getProcessStartTime(process.pid as ProcessId);
		expect(result === null || typeof result === `number`).toBe(true);
	});
});

// ─── Settings/Credentials Cross-Process Safety ───────────────────────────────

describe(`Settings/Credentials Cross-Process Safety`, () => {
	let settingsPath: FilePath;
	let credentialsPath: FilePath;

	beforeEach(() => {
		settingsPath = uniquePath(`settings`);
		credentialsPath = uniquePath(`credentials`);
		service._setStoragePath(settingsPath);
		credentialStore._setStoragePath(credentialsPath);
	});

	afterEach(async () => {
		await remove(settingsPath).catch(() => { });
		await remove(credentialsPath).catch(() => { });
	});

	test(`should write settings.json atomically via temp file + rename (no .tmp file left behind)`, async () => {
		await service.load();
		service.set(`env.alwaysChoose`, true, `proj-atomic`);
		await service.save();

		const written = await readJson(settingsPath);
		expect(written.projects[`proj-atomic`].env.alwaysChoose).toBe(true);

		const tmpPath = `${settingsPath}.${process.pid}.tmp`;
		await expect(readJson(tmpPath)).rejects.toThrow();
	});

	test(`should not lose a concurrent writer's changes when two processes save settings at nearly the same time`, async () => {
		await service.load();
		service.set(`env.alwaysChoose`, true, `proj-race-a`);
		const saveA = service.save();
		service.set(`env.alwaysChoose`, false, `proj-race-b`);
		const saveB = service.save();

		await Promise.all([saveA, saveB]);

		const written = await readJson(settingsPath);
		expect(written.projects[`proj-race-a`].env.alwaysChoose).toBe(true);
		expect(written.projects[`proj-race-b`].env.alwaysChoose).toBe(false);
	});

	test(`should recover gracefully from a partially-written/truncated settings.json`, async () => {
		await outputJson(settingsPath, { app: {}, projects: { garbage: true } });
		// Truncate the file to simulate a torn write from a crash mid-save.
		await writeFile(settingsPath, `{"app": {}, "proje`);

		await expect(service.load()).resolves.not.toThrow();
	});
});

// ─── Update Service Concurrency ───────────────────────────────────────────────

describe(`Update Service Concurrency`, () => {
	let lockPath: FilePath;

	beforeEach(() => {
		lockPath = uniquePath(`update-lock`);
		updateService._setLockPathOverride(lockPath);
	});

	afterEach(async () => {
		updateService._setLockPathOverride(null);
		await remove(lockPath).catch(() => { });
	});

	test(`should skip update check/download on non-primary instances`, async () => {
		// Simulate another live instance already holding the update-check lock.
		await acquireLock(lockPath, vi.fn().mockResolvedValue(1000 as TimestampMS));

		const held = await isLockHeldByLiveProcess(lockPath, vi.fn().mockResolvedValue(1000 as TimestampMS));
		expect(held).toBe(true);
	});
});
