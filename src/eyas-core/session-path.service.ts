import { app } from 'electron';
import _path from 'node:path';
import { shortScopeId } from '@scripts/constants.js';
import type { FilePath, ProjectId, TestId } from '@registry/primitives.js';

/**
 * Resolves the per-project, per-build Chromium profile directory (EYAS-334).
 *
 * The scope ids are hashed rather than embedded raw. Windows caps most paths at 260
 * characters and Chromium nests deeply beneath this root — a projectId (64 chars) plus
 * a testId (36 chars) left too little room, and IndexedDB, Service Worker script
 * caches, and Shared Dictionary all failed to open for any host longer than seven
 * characters. See `shortScopeId` for the full reasoning.
 *
 * Deterministic, so relaunching the same build reuses the same profile.
 */
function getSessionDataDir(projectId: ProjectId, testId: TestId): FilePath {
	const projectSegment = shortScopeId(projectId);
	const testSegment = shortScopeId(testId);

	// Hashing makes the directory unreadable at a glance; log the mapping so a profile
	// on disk can still be traced back to the build that created it.
	console.log(`[SESSION-PATH] profile ${projectSegment}/${testSegment} <- project "${projectId}" / test "${testId}"`);

	return _path.join(app.getPath(`sessionData`), projectSegment, testSegment) as FilePath;
}

export const sessionPathService = {
	getSessionDataDir
};
