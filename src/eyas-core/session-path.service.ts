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
 * Deterministic, so relaunching the same build reuses the same profile — and so a
 * build's directory can be recomputed from its ids whenever one needs identifying.
 */
function getSessionDataDir(projectId: ProjectId, testId: TestId): FilePath {
	return _path.join(app.getPath(`sessionData`), shortScopeId(projectId), shortScopeId(testId)) as FilePath;
}

export const sessionPathService = {
	getSessionDataDir
};
