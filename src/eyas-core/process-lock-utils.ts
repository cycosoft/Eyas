import fsExtra from 'fs-extra';
const { readJson, outputJson } = fsExtra;
import fs from 'node:fs/promises';
import _path from 'node:path';
import type { FilePath, ProcessId, TimestampMS, IsLocked } from '@registry/primitives.js';

/** Contents written to a lock file — enough to detect both "is the owning process alive" and "was this PID reused by an unrelated process". */
type LockFileData = {
	pid: ProcessId;
	startTime: TimestampMS;
};

/**
 * Returns the start time (ms since epoch) of a running process, or null if the
 * process is not running or its start time cannot be determined. Kept as a
 * standalone export so tests can mock platform-specific process inspection
 * without touching the lock read/write logic.
 */
async function getProcessStartTime(pid: ProcessId): Promise<TimestampMS | null> {
	try {
		process.kill(pid, 0); // throws if no such process (or no permission)
	} catch {
		return null;
	}

	// node has no cross-platform "process start time" API; ps is available on
	// macOS/Linux, and on Windows we fall back to "alive" without start-time
	// disambiguation (best-effort — PID reuse window on Windows is smaller in
	// practice due to different PID allocation behavior).
	if (process.platform === `win32`) { return 0 as TimestampMS; }

	try {
		const { execFileSync } = await import(`node:child_process`);
		const out = execFileSync(`ps`, [`-o`, `lstart=`, `-p`, String(pid)], { encoding: `utf8` }).trim();
		if (!out) { return null; }
		return new Date(out).getTime() as TimestampMS;
	} catch {
		return null;
	}
}

async function _readLockFile(lockPath: FilePath): Promise<LockFileData | null> {
	try {
		return await readJson(lockPath);
	} catch {
		return null; // missing or malformed — treat as unlocked
	}
}

/**
 * Reads a lock file and determines whether the process it names is still the
 * one holding the lock (alive, and — where supported — matching start time).
 */
async function isLockHeldByLiveProcess(lockPath: FilePath, checkStartTime: (pid: ProcessId) => Promise<TimestampMS | null> = getProcessStartTime): Promise<IsLocked> {
	const existing = await _readLockFile(lockPath);
	if (!existing || typeof existing.pid !== `number`) { return false; }

	const liveStartTime = await checkStartTime(existing.pid);
	if (liveStartTime === null) { return false; } // process is dead

	// win32 checkStartTime returns 0 (unsupported) — liveness alone is enough there
	if (liveStartTime === 0 || existing.startTime === 0) { return true; }

	return liveStartTime === existing.startTime;
}

/** Overwrites (never deletes) the lock file with this process's own identity. */
async function acquireLock(lockPath: FilePath, getStartTime: (pid: ProcessId) => Promise<TimestampMS | null> = getProcessStartTime): Promise<void> {
	const pid = process.pid as ProcessId;
	const startTime = (await getStartTime(pid)) || (0 as TimestampMS);
	const data: LockFileData = { pid, startTime };
	await outputJson(lockPath, data, { spaces: 2 });
}

/**
 * Atomically claims a lock: two processes racing to acquire the same lock at
 * the same instant cannot both win, because the OS guarantees the exclusive
 * ('wx') file create underneath this only succeeds for one caller. A plain
 * "check then write" (isLockHeldByLiveProcess + acquireLock) has a window
 * between the two steps where both racers can observe "unheld" and both
 * proceed — this closes that window for the case that matters (two fresh
 * instances launched at once). If the file already exists and its owner is
 * dead/stale, falls back to a non-exclusive overwrite; two simultaneous
 * crash-recovery launches may then both succeed, which is an accepted, far
 * rarer edge case than two fresh launches racing.
 */
async function tryAcquireLockAtomically(lockPath: FilePath, checkStartTime: (pid: ProcessId) => Promise<TimestampMS | null> = getProcessStartTime): Promise<IsLocked> {
	const pid = process.pid as ProcessId;
	const startTime = (await checkStartTime(pid)) || (0 as TimestampMS);
	const data: LockFileData = { pid, startTime };

	await fsExtra.ensureDir(_path.dirname(lockPath));

	try {
		const handle = await fs.open(lockPath, `wx`);
		await handle.writeFile(JSON.stringify(data, null, 2));
		await handle.close();
		return true;
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code !== `EEXIST`) { throw err; }
	}

	const isHeld = await isLockHeldByLiveProcess(lockPath, checkStartTime);
	if (isHeld) { return false; }

	await outputJson(lockPath, data, { spaces: 2 });
	return true;
}

export {
	getProcessStartTime,
	isLockHeldByLiveProcess,
	acquireLock,
	tryAcquireLockAtomically
};
