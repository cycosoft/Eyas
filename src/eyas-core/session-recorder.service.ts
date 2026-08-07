import { app } from 'electron';
import _path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs-extra';
const { outputJson } = fs;
import type { CoreContext } from '@registry/eyas-core.js';
import type { EyasRecordingEnvelope, RecordingStep, LegacySelectorGroup } from '@registry/recording.js';
import type { RecordingSessionSummary } from '@registry/ipc.js';
import type { ProjectId, TestId, FilePath, DomainUrl, SessionId, IsActive, PopupId, IsUnknownSchema, SchemaVersion } from '@registry/primitives.js';

const CURRENT_SCHEMA_VERSION = `1.2.0`;

/**
 * Every `eyasSchemaVersion` this build can read. Deliberately a membership test rather than an
 * ordered comparison: "newer than us" is the case that matters, but a missing or malformed version
 * is indistinguishable from it in consequence, and an ordered compare passes both silently
 * (`undefined` parses to NaN, and every NaN comparison is false).
 */
const KNOWN_SCHEMA_VERSIONS = new Set<SchemaVersion>([`1.0.0`, `1.1.0`, CURRENT_SCHEMA_VERSION]);

/**
 * Whether a session was written by a build this one doesn't understand. Read as a raw string on
 * purpose — the envelope's type says only the known versions exist, which is exactly the assumption
 * a file from a newer build breaks.
 */
function isUnknownSchema(session: EyasRecordingEnvelope): IsUnknownSchema {
	return !KNOWN_SCHEMA_VERSIONS.has(session.eyasSchemaVersion as SchemaVersion);
}

let _session: EyasRecordingEnvelope | null = null;
let _sessionFilePath: FilePath | null = null;
let _sessionsDirOverride: FilePath | null = null;
let _isReplaying = false;

function _sessionsDir(): FilePath {
	return _sessionsDirOverride ?? _path.join(app.getPath(`userData`), `sessions`);
}

/** Test-only hook: overrides the sessions directory and clears in-memory state. */
function _setSessionsDir(dir: FilePath | null): void {
	_sessionsDirOverride = dir;
	_session = null;
	_sessionFilePath = null;
}

function _generateSessionId(): SessionId {
	return randomUUID() as SessionId;
}

/** Only one recording is ever active at a time, so it lives at a fixed path per project+testId instead of one file per UUID — starting a new recording overwrites it, leaving nothing to clean up. Scoped by testId (not just projectId) so concurrent Eyas instances running different test builds against the same project don't overwrite each other's active recording. */
function _activeSessionPath(projectId: ProjectId, testId: TestId): FilePath {
	return _path.join(_sessionsDir(), projectId, testId, `active-session.json`) as FilePath;
}

/** Future "saved recordings" location: not yet written to, but getSession already checks it so that feature won't need to change this function's by-ID contract again. Scoped by projectId only (not testId) so a saved recording can be replayed against any build of the project it was made on. */
function _savedSessionPath(projectId: ProjectId, sessionId: SessionId): FilePath {
	return _path.join(_sessionsDir(), projectId, `saved`, `${sessionId}.json`) as FilePath;
}

function _isLegacySelectorGroup(selectors: unknown): selectors is LegacySelectorGroup {
	return !!selectors && typeof selectors === `object` && !Array.isArray(selectors) && `primary` in selectors;
}

/** Sessions written by the 1.0.0 recorder store `selectors` as `{ primary, fallbacks }` — upgrade to the ordered candidate array read everywhere else. */
function _upgradeSession(session: EyasRecordingEnvelope): EyasRecordingEnvelope {
	if (session.eyasSchemaVersion !== `1.0.0`) { return session; }

	session.recording.steps = session.recording.steps.map(step => {
		if (step.type !== `click` && step.type !== `change`) { return step; }
		const selectors = step.selectors as unknown;
		if (!_isLegacySelectorGroup(selectors)) { return step; }
		return { ...step, selectors: [selectors.primary, ...selectors.fallbacks] };
	});
	session.eyasSchemaVersion = `1.1.0`;

	return session;
}

// Sequentializes writes to prevent concurrent write issues (mirrors settings-service.ts).
let _saveQueue = Promise.resolve();
function _persist(): Promise<void> {
	_saveQueue = _saveQueue.then(async () => {
		if (!_session || !_sessionFilePath) { return; }
		await outputJson(_sessionFilePath, _session, { spaces: 2 });
	}).catch(err => {
		console.error(`[SESSION-RECORDER-SERVICE] save failed:`, err);
	});

	return _saveQueue;
}

/** Starts a new recording session and writes the session file to disk immediately. */
async function startSession(ctx: CoreContext): Promise<void> {
	const projectId = (ctx.$config?.meta.projectId || `default`) as ProjectId;
	const testId = (ctx.$config?.meta.testId || `default`) as TestId;
	const sessionId = _generateSessionId();
	const startedAt = Date.now();

	_session = {
		eyasSchemaVersion: CURRENT_SCHEMA_VERSION,
		projectId,
		sessionId,
		title: new Date(startedAt).toISOString(),
		status: `recording`,
		startedAt,
		stoppedAt: null,
		startUrl: (ctx.$testLayer?.webContents?.getURL() || null) as DomainUrl | null,
		viewport: { width: ctx.$currentViewport[0], height: ctx.$currentViewport[1] },
		components: {},
		recording: { title: new Date(startedAt).toISOString(), steps: [] }
	};

	_sessionFilePath = _activeSessionPath(projectId, testId);
	await _persist();

	ctx.$eyasLayer?.webContents?.send(`recorder-status-updated`, { isRecording: true, sessionId });
}

/** Appends flushed steps from the recorder preload to the active session and persists. */
function appendSteps(steps: RecordingStep[]): void {
	if (!_session || _session.status !== `recording` || _isReplaying || steps.length === 0) { return; }
	_session.recording.steps.push(...steps);
	_persist();
}

/** Appends a NavigateStep captured from the main-process webContents navigation events. */
function appendNavigateStep(url: DomainUrl): void {
	if (!_session || _session.status !== `recording` || _isReplaying) { return; }
	_session.recording.steps.push({ type: `navigate`, url, timestamp: Date.now() });
	_persist();
}

/** Appends a CloseWindowStep captured from a tracked popup's 'closed' event. */
function appendCloseWindowStep(popupId: PopupId): void {
	if (!_session || _session.status !== `recording` || _isReplaying) { return; }
	_session.recording.steps.push({ type: `closeWindow`, popupId, timestamp: Date.now() });
	_persist();
}

/** Marks whether a replay is currently dispatching, so its own navigation isn't re-recorded. */
function setReplaying(isReplaying: IsActive): void {
	_isReplaying = isReplaying;
}

/** Whether a replay is currently dispatching. */
function isReplaying(): IsActive {
	return _isReplaying;
}

/** Stops the active recording session, finalizing status and persisting to disk. */
function stopRecording(ctx: CoreContext): void {
	if (!_session) { return; }
	_session.status = `stopped`;
	_session.stoppedAt = Date.now();
	_persist();

	ctx.$eyasLayer?.webContents?.send(`recorder-status-updated`, { isRecording: false, sessionId: _session.sessionId });
}

function getActiveSession(): EyasRecordingEnvelope | null {
	return _session;
}

/** Loads a recording session by id: the in-memory session if it matches, otherwise reads it from disk. */
async function getSession(ctx: CoreContext, sessionId: SessionId): Promise<EyasRecordingEnvelope | null> {
	if (_session?.sessionId === sessionId) { return _session; }

	const projectId = (ctx.$config?.meta.projectId || `default`) as ProjectId;

	const savedPath = _savedSessionPath(projectId, sessionId);
	if (await fs.pathExists(savedPath)) { return _upgradeSession(await fs.readJson(savedPath)); }

	// listSessions surfaces every testId's active-session.json for this project, not just the
	// currently-running test's — so a requested session may live under any of them.
	const projectDir = _path.join(_sessionsDir(), projectId);
	if (!(await fs.pathExists(projectDir))) { return null; }

	const entries = await fs.readdir(projectDir, { withFileTypes: true });
	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name === `saved`) { continue; }

		const activePath = _activeSessionPath(projectId, entry.name as TestId);
		if (!(await fs.pathExists(activePath))) { continue; }

		const active: EyasRecordingEnvelope = await fs.readJson(activePath);
		if (active.sessionId === sessionId) { return _upgradeSession(active); }
	}

	return null;
}

/** Reads a session file into a listing summary, or null if it's missing or unreadable — a corrupt/partial file must not blank the whole listing. */
async function _readSummary(filePath: FilePath): Promise<RecordingSessionSummary | null> {
	try {
		if (!(await fs.pathExists(filePath))) { return null; }
		const session: EyasRecordingEnvelope = await fs.readJson(filePath);
		return {
			sessionId: session.sessionId,
			title: session.title,
			status: session.status,
			startedAt: session.startedAt,
			stoppedAt: session.stoppedAt,
			stepCount: session.recording.steps.length
		};
	} catch (err) {
		console.error(`[SESSION-RECORDER-SERVICE] skipping unreadable session file ${filePath}:`, err);
		return null;
	}
}

/** Lists every recording found for the current project — one per testId's active-session.json, plus anything already in `saved/` — newest first. Missing directories yield an empty list rather than an error, since a fresh install has no sessions dir at all. */
async function listSessions(ctx: CoreContext): Promise<RecordingSessionSummary[]> {
	const projectId = (ctx.$config?.meta.projectId || `default`) as ProjectId;
	const projectDir = _path.join(_sessionsDir(), projectId);
	if (!(await fs.pathExists(projectDir))) { return []; }

	const entries = await fs.readdir(projectDir, { withFileTypes: true });
	const summaries: RecordingSessionSummary[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) { continue; }

		if (entry.name === `saved`) {
			const savedDir = _path.join(projectDir, `saved`);
			const savedFiles = await fs.readdir(savedDir);
			for (const file of savedFiles) {
				const summary = await _readSummary(_path.join(savedDir, file) as FilePath);
				if (summary) { summaries.push(summary); }
			}
			continue;
		}

		const summary = await _readSummary(_path.join(projectDir, entry.name, `active-session.json`) as FilePath);
		if (summary) { summaries.push(summary); }
	}

	return summaries.sort((a, b) => b.startedAt - a.startedAt);
}

export {
	startSession,
	appendSteps,
	appendNavigateStep,
	appendCloseWindowStep,
	stopRecording,
	getSession,
	listSessions,
	setReplaying,
	isReplaying,
	isUnknownSchema
};

export default {
	startSession,
	appendSteps,
	appendNavigateStep,
	appendCloseWindowStep,
	stopRecording,
	setReplaying,
	isReplaying,
	getActiveSession,
	getSession,
	listSessions,
	isUnknownSchema,
	_setSessionsDir
};
