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
 * complete, not why. Otherwise derived by iterating that run's `run_steps` rather than trusting a
 * cached run-level value — playback continues past a soft-assertion mismatch (it's not a hard-stop
 * runner), so a run can finish "naturally" while a step inside it still failed.
 */
type LastRunSummary = { outcome: RunOutcome | null };

type RunRow = { runId: RunId; endedAt: TimestampMS | null };
type FailureCountRow = { failureCount: number };

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
			endedAt INTEGER
		);
		CREATE TABLE IF NOT EXISTS run_steps (
			runId TEXT NOT NULL,
			stepIndex INTEGER NOT NULL,
			happenedAt INTEGER NOT NULL,
			outcome TEXT NOT NULL DEFAULT 'passed'
		);
		CREATE INDEX IF NOT EXISTS runs_by_recording ON runs (recordingId, startedAt);
	`);
	_dbsByProjectId.set(projectId, db);
	return db;
}

/** Opens a new run for a recording and returns its runId. `endedAt` stays null until `finishRun` is called — a crash or user-initiated stop simply never calls it, which is what marks the run as never having finished. */
async function startRun(projectId: ProjectId, recordingId: SessionId): Promise<RunId> {
	const runId = randomUUID() as RunId;
	const db = _openDb(projectId);
	db.prepare(`INSERT INTO runs (runId, recordingId, startedAt, endedAt) VALUES (?, ?, ?, NULL)`)
		.run(runId, recordingId, Date.now() as TimestampMS);
	return runId;
}

/** Records that a step began dispatching. Written on start, not completion — a step is an instantaneous action, so this is also what lets a hung/crashed run reveal exactly which step it got to. Optimistically `passed`; flipped by `recordStepFailure` if the step mismatches or throws. */
async function recordStepStart(projectId: ProjectId, runId: RunId, stepIndex: StepIndex): Promise<void> {
	const db = _openDb(projectId);
	db.prepare(`INSERT INTO run_steps (runId, stepIndex, happenedAt) VALUES (?, ?, ?)`)
		.run(runId, stepIndex, Date.now() as TimestampMS);
}

/** Flips a step's recorded outcome to `failed` — a soft-assertion mismatch (replay continues) or a thrown exception (replay stops) on that step. */
async function recordStepFailure(projectId: ProjectId, runId: RunId, stepIndex: StepIndex): Promise<void> {
	const db = _openDb(projectId);
	db.prepare(`UPDATE run_steps SET outcome = 'failed' WHERE runId = ? AND stepIndex = ?`)
		.run(runId, stepIndex);
}

/** Marks a run as finished (sets `endedAt`). Only called on a natural finish or a caught failure — never on user-stop or crash, so those stay recoverable as "never finished". The pass/fail verdict itself is never cached here — it's always derived by iterating `run_steps` (see `getLastRunForRecording`), since playback continues past soft-assertion mismatches and a cached run-level flag would drift from the per-step reality. */
async function finishRun(projectId: ProjectId, runId: RunId): Promise<void> {
	const db = _openDb(projectId);
	db.prepare(`UPDATE runs SET endedAt = ? WHERE runId = ?`)
		.run(Date.now() as TimestampMS, runId);
}

/** The verdict for a recording's most recent run, for the Recordings panel dot. Null if the recording has never been played. A run that never finished (`endedAt` still null) reads as `failed`. Otherwise, `failed` if any of its steps failed, else `passed` — derived by iterating `run_steps` rather than trusting a cached value. */
async function getLastRunForRecording(projectId: ProjectId, recordingId: SessionId): Promise<LastRunSummary | null> {
	const db = _openDb(projectId);
	const run = db.prepare(`SELECT runId, endedAt FROM runs WHERE recordingId = ? ORDER BY startedAt DESC LIMIT 1`)
		.get(recordingId) as RunRow | undefined;

	if (!run) { return null; }
	if (run.endedAt === null) { return { outcome: `failed` }; }

	const failures = db.prepare(`SELECT COUNT(*) AS failureCount FROM run_steps WHERE runId = ? AND outcome = 'failed'`)
		.get(run.runId) as FailureCountRow;
	return { outcome: failures.failureCount > 0 ? `failed` : `passed` };
}

export default { startRun, recordStepStart, recordStepFailure, finishRun, getLastRunForRecording, _setSessionsDir };
