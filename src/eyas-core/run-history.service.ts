import { app } from 'electron';
import _path from 'path';
import { randomUUID } from 'crypto';
import fsExtra from 'fs-extra';
import { DatabaseSync } from 'node:sqlite';
import type { ProjectId, SessionId, RunId, FilePath, StepIndex, TimestampMS } from '@registry/primitives.js';

type RunOutcome = `passed` | `failed`;

/**
 * The dot-facing verdict for a recording's most recent run. A run that never reached `finishRun`
 * (crashed, hung, or was stopped by the user) reads back with `endedAt === null` — collapsed here
 * to `failed` rather than surfaced as its own state, since the user only cares that it didn't
 * complete, not why.
 */
type LastRunSummary = { outcome: RunOutcome | null };

type RunRow = { endedAt: TimestampMS | null; outcome: RunOutcome | null };

let _dbsByProjectId = new Map<ProjectId, DatabaseSync>();
let _dbDirOverride: FilePath | null = null;

function _dbDir(): FilePath {
	return _dbDirOverride ?? _path.join(app.getPath(`userData`), `sessions`) as FilePath;
}

/** Test-only hook: overrides the sessions directory and closes any open connections so a fresh directory isn't cross-contaminated by a stale in-memory connection cache. */
function _setSessionsDir(dir: FilePath | null): void {
	_dbDirOverride = dir;
	for (const db of _dbsByProjectId.values()) { db.close(); }
	_dbsByProjectId = new Map();
}

/** `runs.sqlite` lives alongside sessions/{projectId}/*.json — a sibling of the recording files it describes, not nested under them. */
function _dbPath(projectId: ProjectId): FilePath {
	return _path.join(_dbDir(), projectId, `runs.sqlite`) as FilePath;
}

function _openDb(projectId: ProjectId): DatabaseSync {
	const existing = _dbsByProjectId.get(projectId);
	if (existing) { return existing; }

	fsExtra.ensureDirSync(_path.join(_dbDir(), projectId));
	const db = new DatabaseSync(_dbPath(projectId));
	db.exec(`
		CREATE TABLE IF NOT EXISTS runs (
			runId TEXT PRIMARY KEY,
			recordingId TEXT NOT NULL,
			startedAt INTEGER NOT NULL,
			endedAt INTEGER,
			outcome TEXT
		);
		CREATE TABLE IF NOT EXISTS run_steps (
			runId TEXT NOT NULL,
			stepIndex INTEGER NOT NULL,
			happenedAt INTEGER NOT NULL
		);
		CREATE INDEX IF NOT EXISTS runs_by_recording ON runs (recordingId, startedAt);
	`);
	_dbsByProjectId.set(projectId, db);
	return db;
}

/** Opens a new run for a recording and returns its runId. `endedAt`/`outcome` stay null until `finishRun` is called — a crash or user-initiated stop simply never calls it, which is what marks the run as never having finished. */
async function startRun(projectId: ProjectId, recordingId: SessionId): Promise<RunId> {
	const runId = randomUUID() as RunId;
	const db = _openDb(projectId);
	db.prepare(`INSERT INTO runs (runId, recordingId, startedAt, endedAt, outcome) VALUES (?, ?, ?, NULL, NULL)`)
		.run(runId, recordingId, Date.now() as TimestampMS);
	return runId;
}

/** Records that a step began dispatching. Written on start, not completion — a step is an instantaneous action, so this is also what lets a hung/crashed run reveal exactly which step it got to. */
async function recordStepStart(projectId: ProjectId, runId: RunId, stepIndex: StepIndex): Promise<void> {
	const db = _openDb(projectId);
	db.prepare(`INSERT INTO run_steps (runId, stepIndex, happenedAt) VALUES (?, ?, ?)`)
		.run(runId, stepIndex, Date.now() as TimestampMS);
}

/** Marks a run as finished. Only called on a natural pass or a caught failure — never on user-stop or crash, so those stay recoverable as "never finished" rather than misreported as a specific outcome. */
async function finishRun(projectId: ProjectId, runId: RunId, outcome: RunOutcome): Promise<void> {
	const db = _openDb(projectId);
	db.prepare(`UPDATE runs SET endedAt = ?, outcome = ? WHERE runId = ?`)
		.run(Date.now() as TimestampMS, outcome, runId);
}

/** The verdict for a recording's most recent run, for the Recordings panel dot. Null if the recording has never been played. A run that never finished (`endedAt` still null) reads as `failed` — same visual treatment as an explicit failure. */
async function getLastRunForRecording(projectId: ProjectId, recordingId: SessionId): Promise<LastRunSummary | null> {
	const db = _openDb(projectId);
	const row = db.prepare(`SELECT endedAt, outcome FROM runs WHERE recordingId = ? ORDER BY startedAt DESC LIMIT 1`)
		.get(recordingId) as RunRow | undefined;

	if (!row) { return null; }
	return { outcome: row.endedAt === null ? `failed` : row.outcome };
}

export default { startRun, recordStepStart, finishRun, getLastRunForRecording, _setSessionsDir };
