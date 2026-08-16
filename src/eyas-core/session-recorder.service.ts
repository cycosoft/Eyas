import { app } from 'electron';
import _path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs-extra';
const { outputJson } = fs;
import type { CoreContext } from '@registry/eyas-core.js';
import type { EyasRecordingEnvelope, RecordingStep, LegacySelectorGroup } from '@registry/recording.js';
import type { RecordingSessionSummary } from '@registry/ipc.js';
import type { ProjectId, FilePath, DomainUrl, SessionId, IsActive, PopupId, IsUnknownSchema, SchemaVersion } from '@registry/primitives.js';
import runHistoryService from './run-history.service.js';

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

/** What this instance is doing right now — ephemeral, never persisted. The saved recording file is a pure blueprint with no opinion about it. */
let _mode: `idle` | `recording` = `idle`;

function _sessionsDir(): FilePath {
	return _sessionsDirOverride ?? _path.join(app.getPath(`userData`), `sessions`);
}

/** Test-only hook: overrides the sessions directory and clears in-memory state. */
function _setSessionsDir(dir: FilePath | null): void {
	_sessionsDirOverride = dir;
	_session = null;
	_sessionFilePath = null;
	_mode = `idle`;
}

function _generateSessionId(): SessionId {
	return randomUUID() as SessionId;
}

/** Every session — in-progress or finished — lives at a flat path keyed by its own unique sessionId, scoped by projectId only. No testId axis: testId is per-build metadata, not a stable workspace identity, and scoping by it caused build swaps to abandon orphaned in-progress files that never got cleaned up. Since sessionId is unique from the moment a recording starts, there's nothing to overwrite and no cross-instance collision to guard against. */
function _sessionPath(projectId: ProjectId, sessionId: SessionId): FilePath {
	return _path.join(_sessionsDir(), projectId, `${sessionId}.json`) as FilePath;
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
	const sessionId = _generateSessionId();
	const startedAt = Date.now();

	_session = {
		eyasSchemaVersion: CURRENT_SCHEMA_VERSION,
		projectId,
		sessionId,
		title: new Date(startedAt).toISOString(),
		startedAt,
		stoppedAt: null,
		startUrl: (ctx.$testLayer?.webContents?.getURL() || null) as DomainUrl | null,
		viewport: { width: ctx.$currentViewport[0], height: ctx.$currentViewport[1] },
		components: {},
		recording: { title: new Date(startedAt).toISOString(), steps: [] }
	};

	_sessionFilePath = _sessionPath(projectId, sessionId);
	_mode = `recording`;
	await _persist();

	ctx.$eyasLayer?.webContents?.send(`recorder-status-updated`, { isRecording: true, sessionId });
}

/** Pushes the in-progress session to the eyas layer so a detail view already open on it (see RecordingPanel.vue) reflects newly-appended steps live, instead of the snapshot from whenever it was first opened. Reuses the existing 'recorder-session-loaded' channel — the store's setSelectedSessionDetail already no-ops for a session that isn't the one currently selected, so broadcasting unconditionally here is safe. */
function _broadcastSessionUpdate(ctx: CoreContext): void {
	if (!_session) { return; }
	ctx.$eyasLayer?.webContents?.send(`recorder-session-loaded`, _session);
}

/** Appends flushed steps from the recorder preload to the active session and persists. */
function appendSteps(ctx: CoreContext, steps: RecordingStep[]): void {
	if (!_session || _mode !== `recording` || _isReplaying || steps.length === 0) { return; }
	_session.recording.steps.push(...steps);
	_persist();
	_broadcastSessionUpdate(ctx);
}

/** Appends a NavigateStep captured from the main-process webContents navigation events. */
function appendNavigateStep(ctx: CoreContext, url: DomainUrl): void {
	if (!_session || _mode !== `recording` || _isReplaying) { return; }
	_session.recording.steps.push({ type: `navigate`, url, timestamp: Date.now() });
	_persist();
	_broadcastSessionUpdate(ctx);
}

/** Appends a CloseWindowStep captured from a tracked popup's 'closed' event. */
function appendCloseWindowStep(ctx: CoreContext, popupId: PopupId): void {
	if (!_session || _mode !== `recording` || _isReplaying) { return; }
	_session.recording.steps.push({ type: `closeWindow`, popupId, timestamp: Date.now() });
	_persist();
	_broadcastSessionUpdate(ctx);
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
	_session.stoppedAt = Date.now();
	_mode = `idle`;
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

	const sessionPath = _sessionPath(projectId, sessionId);
	if (!(await fs.pathExists(sessionPath))) { return null; }

	return _upgradeSession(await fs.readJson(sessionPath));
}

/** Reads a session file into a listing summary, or null if it's missing or unreadable — a corrupt/partial file must not blank the whole listing. Takes projectId from the caller (which already knows it from the directory being scanned) rather than the file's own contents, so a hand-edited or legacy file missing that field still resolves the right runs.sqlite. */
async function _readSummary(filePath: FilePath, projectId: ProjectId): Promise<RecordingSessionSummary | null> {
	try {
		if (!(await fs.pathExists(filePath))) { return null; }
		const session: EyasRecordingEnvelope = await fs.readJson(filePath);
		const lastRun = await runHistoryService.getLastRunForRecording(projectId, session.sessionId);
		return {
			sessionId: session.sessionId,
			title: session.title,
			startedAt: session.startedAt,
			stoppedAt: session.stoppedAt,
			stepCount: session.recording.steps.length,
			lastRunOutcome: lastRun?.outcome ?? null
		};
	} catch (err) {
		console.error(`[SESSION-RECORDER-SERVICE] skipping unreadable session file ${filePath}:`, err);
		return null;
	}
}

/** Lists every recording found for the current project — one file per sessionId, directly under sessions/{projectId}/ — newest first. Missing directory yields an empty list rather than an error, since a fresh install has no sessions dir at all. Non-JSON entries (e.g. leftover legacy testId directories from before recordings were scoped by projectId only) are skipped. */
async function listSessions(ctx: CoreContext): Promise<RecordingSessionSummary[]> {
	const projectId = (ctx.$config?.meta.projectId || `default`) as ProjectId;
	const projectDir = _path.join(_sessionsDir(), projectId);
	if (!(await fs.pathExists(projectDir))) { return []; }

	const entries = await fs.readdir(projectDir, { withFileTypes: true });
	const summaries: RecordingSessionSummary[] = [];

	for (const entry of entries) {
		if (!entry.isFile() || !entry.name.endsWith(`.json`)) { continue; }

		const summary = await _readSummary(_path.join(projectDir, entry.name) as FilePath, projectId);
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
