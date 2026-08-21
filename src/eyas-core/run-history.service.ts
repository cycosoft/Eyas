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
type StepOutcomeRow = { stepIndex: StepIndex; outcome: RunOutcome };
type ColumnInfoRow = { name: string };

/**
 * Per-step outcomes for a recording's most recent run, for the detail view's step icons.
 * `finished: false` (no `endedAt` yet — crash or user-stop) means `outcomes` is a partial picture
 * of an interrupted run, not a verdict on the steps it happened to reach — callers should treat
 * this the same as "never run" rather than trusting the partial data.
 */
type StepOutcomes = { finished: boolean; outcomes: Partial<Record<StepIndex, RunOutcome>> };

let _dbsByProjectId = new Map<ProjectId, DatabaseSync>();
let _dbDirOverride: FilePath | null = null;

function _dbDir(): FilePath {
	return _dbDirOverride ?? _path.join(app.getPath(`userData`), `sessions`) as FilePath;
}

/** Vitest runs in-process, so nothing else stands between a forgotten `_setSessionsDir()` call and this service opening (or creating) a real `runs.sqlite` under whatever `app.getPath('userData')` resolves to. e2e is exempt — Playwright launches Eyas as a separate process with `--user-data-dir` pointed at a temp dir, which redirects `app.getPath('userData')` itself before this module ever runs. */
function _assertNotRealDbUnderTest(): void {
	if (process.env.VITEST && _dbDirOverride === null) {
		throw new Error(`run-history.service: refusing to open the real userData database during a Vitest run. Call service._setSessionsDir(tmpDir) in beforeEach, or mock '@core/run-history.service.js' entirely.`);
	}
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
	_assertNotRealDbUnderTest();
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
	_migrateAddOutcomeColumn(db);
	_dbsByProjectId.set(projectId, db);
	return db;
}

/** `CREATE TABLE IF NOT EXISTS` doesn't add columns to a table that already existed before `outcome` was introduced — without this, every pre-existing `runs.sqlite` throws `no such column: outcome` on every query. */
function _migrateAddOutcomeColumn(db: DatabaseSync): void {
	const columns = db.prepare(`PRAGMA table_info(run_steps)`).all() as ColumnInfoRow[];
	if (columns.some(column => column.name === `outcome`)) { return; }
	db.exec(`ALTER TABLE run_steps ADD COLUMN outcome TEXT NOT NULL DEFAULT 'passed'`);
}

/** Opens a new run for a recording and returns its runId. `endedAt` stays null until `finishRun` is called — a crash or user-initiated stop simply never calls it, which is what marks the run as never having finished. */
async function startRun(projectId: ProjectId, recordingId: SessionId): Promise<RunId> {
	const runId = randomUUID() as RunId;
	const db = _openDb(projectId);
	db.prepare(`INSERT INTO runs (runId, recordingId, startedAt, endedAt) VALUES (?, ?, ?, NULL)`)
		.run(runId, recordingId, Date.now() as TimestampMS);
	return runId;
}

/** Records that a step began dispatching. Optimistically `passed`; flipped by `recordStepFailure` if the step mismatches or throws. */
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

/** Per-step outcomes for a recording's most recent run, for the detail view's step icons. `null` if the recording has never been played. */
async function getStepOutcomes(projectId: ProjectId, recordingId: SessionId): Promise<StepOutcomes | null> {
	const db = _openDb(projectId);
	const run = db.prepare(`SELECT runId, endedAt FROM runs WHERE recordingId = ? ORDER BY startedAt DESC LIMIT 1`)
		.get(recordingId) as RunRow | undefined;

	if (!run) { return null; }

	const rows = db.prepare(`SELECT stepIndex, outcome FROM run_steps WHERE runId = ?`)
		.all(run.runId) as StepOutcomeRow[];
	const outcomes: Partial<Record<StepIndex, RunOutcome>> = {};
	for (const row of rows) { outcomes[row.stepIndex] = row.outcome; }

	return { finished: run.endedAt !== null, outcomes };
}

/** Deletes every run (and its steps) recorded for a recording — called when the recording itself is deleted, so no orphaned history outlives it. */
async function deleteRecordingHistory(projectId: ProjectId, recordingId: SessionId): Promise<void> {
	const db = _openDb(projectId);
	const runs = db.prepare(`SELECT runId FROM runs WHERE recordingId = ?`).all(recordingId) as RunRow[];
	const deleteSteps = db.prepare(`DELETE FROM run_steps WHERE runId = ?`);
	for (const run of runs) { deleteSteps.run(run.runId); }
	db.prepare(`DELETE FROM runs WHERE recordingId = ?`).run(recordingId);
}

export default { startRun, recordStepStart, recordStepFailure, finishRun, getLastRunForRecording, getStepOutcomes, deleteRecordingHistory, _setSessionsDir };
