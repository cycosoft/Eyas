import { app, dialog } from 'electron';
import _path from 'node:path';
import type { FilePath, ProjectId, TestId, ProcessId, TimestampMS, CanProceed } from '@registry/primitives.js';
import { tryAcquireLockAtomically, getProcessStartTime } from './process-lock-utils.js';

let _sessionsDirOverride: FilePath | null = null;

/** Test-only escape hatch — redirect lock file I/O to a temp directory. */
function _setSessionsDirOverride(dir: FilePath | null): void {
	_sessionsDirOverride = dir;
}

function _sessionsDir(): FilePath {
	return _sessionsDirOverride ?? _path.join(app.getPath(`userData`), `sessions`) as FilePath;
}

function _lockPath(projectId: ProjectId, testId: TestId): FilePath {
	return _path.join(_sessionsDir(), projectId, testId, `instance.lock`) as FilePath;
}

/**
 * Checks whether another live instance already owns projectId+testId. If so,
 * shows a native dialog and returns false (caller must not proceed). If not,
 * overwrites the lock with this process's own identity and returns true.
 *
 * Must run immediately after config resolves projectId/testId, before any
 * session/settings side effects (window creation, session-recorder init, etc.)
 * so a blocked instance never writes anything before being told to leave.
 */
async function tryAcquire(
	projectId: ProjectId,
	testId: TestId,
	checkStartTime: (pid: ProcessId) => Promise<TimestampMS | null> = getProcessStartTime
): Promise<CanProceed> {
	const lockPath = _lockPath(projectId, testId);

	const acquired = await tryAcquireLockAtomically(lockPath, checkStartTime);
	if (!acquired) {
		dialog.showErrorBox(
			`Eyas is already running this test`,
			`This test build is already open in another Eyas window. Close it before launching another instance of the same build.`
		);
		return false;
	}

	return true;
}

export const instanceLockService = {
	tryAcquire,
	_setSessionsDirOverride
};
