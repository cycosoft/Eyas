import { app } from 'electron';
import _path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs-extra';
const { outputJson } = fs;
import type { CoreContext } from '@registry/eyas-core.js';
import type { EyasRecordingEnvelope, RecordingStep, LegacySelectorGroup } from '@registry/recording.js';
import type { ProjectId, FilePath, DomainUrl, SessionId, IsActive, PopupId } from '@registry/primitives.js';

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
		eyasSchemaVersion: `1.1.0`,
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

	_sessionFilePath = _path.join(_sessionsDir(), projectId, `${sessionId}.json`);
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
	const filePath = _path.join(_sessionsDir(), projectId, `${sessionId}.json`);
	if (!(await fs.pathExists(filePath))) { return null; }

	return _upgradeSession(await fs.readJson(filePath));
}

export {
	startSession,
	appendSteps,
	appendNavigateStep,
	appendCloseWindowStep,
	stopRecording,
	getSession,
	setReplaying,
	isReplaying
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
	_setSessionsDir
};
