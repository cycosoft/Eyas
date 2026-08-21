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
	_pendingStepsByRun = new Map();
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

type PendingStep = { projectId: ProjectId; stepIndex: StepIndex; happenedAt: TimestampMS };

// A hard synchronous INSERT per step (node:sqlite has no async I/O to yield on) was blocking the
// playback loop between every single step, stuttering the whole app during a run. Batching to disk
// every N steps, off the step-dispatch tick via setImmediate, trades exact crash-recovery
// granularity (a hard crash mid-batch loses the tail's start times) for that not happening at all.
const STEP_BATCH_SIZE = 10;
let _pendingStepsByRun = new Map<RunId, PendingStep[]>();

/** Writes every buffered step-start row for a run in one transaction, then clears its buffer. Safe to call with nothing pending (no-op) — callers that need the DB to reflect a run's steps so far (recordStepFailure, finishRun, an aborted run) call this first rather than assuming a batch has already landed. */
function _flushPendingSteps(runId: RunId): void {
	const pending = _pendingStepsByRun.get(runId);
	if (!pending || pending.length === 0) { return; }
	// only cleared on a confirmed write — left in place on any failure (including _openDb throwing
	// before a transaction even opens) so the rows aren't lost, just retried on the next flush
	_pendingStepsByRun.delete(runId);
	try {
		const db = _openDb(pending[0].projectId);
		const insert = db.prepare(`INSERT INTO run_steps (runId, stepIndex, happenedAt) VALUES (?, ?, ?)`);
		db.exec(`BEGIN`);
		try {
			for (const step of pending) { insert.run(runId, step.stepIndex, step.happenedAt); }
			db.exec(`COMMIT`);
		} catch (err) {
			db.exec(`ROLLBACK`);
			throw err;
		}
	} catch (err) {
		_pendingStepsByRun.set(runId, pending);
		throw err;
	}
}

/** Flushes a run's buffered step-start rows to disk. Exported so playback can force a write at points the batch size alone wouldn't reach — an aborted (user-stopped) run in particular never calls finishRun, which would otherwise be the only remaining flush point. */
async function flushPendingSteps(runId: RunId): Promise<void> {
	_flushPendingSteps(runId);
}

/** Records that a step began dispatching. Buffered in memory and written in batches of STEP_BATCH_SIZE (see _flushPendingSteps) rather than one INSERT per step — a hung/crashed run still reveals roughly where it got to, just rounded down to its last flushed batch instead of the exact step. Optimistically `passed`; flipped by `recordStepFailure` if the step mismatches or throws. Not awaited by the caller's step loop: the batch write itself is deferred off this tick via setImmediate so a full batch's INSERTs never land in the same tick as step dispatch. */
async function recordStepStart(projectId: ProjectId, runId: RunId, stepIndex: StepIndex): Promise<void> {
	const pending = _pendingStepsByRun.get(runId) ?? [];
	pending.push({ projectId, stepIndex, happenedAt: Date.now() as TimestampMS });
	_pendingStepsByRun.set(runId, pending);

	if (pending.length >= STEP_BATCH_SIZE) {
		setImmediate(() => { try { _flushPendingSteps(runId); } catch { /* next flush (batch/failure/finish) retries with the same buffered rows */ } });
	}
}

/** Flips a step's recorded outcome to `failed` — a soft-assertion mismatch (replay continues) or a thrown exception (replay stops) on that step. Flushes first: the failing step's own row may still be sitting in the in-memory batch buffer rather than in the table this UPDATE targets. */
async function recordStepFailure(projectId: ProjectId, runId: RunId, stepIndex: StepIndex): Promise<void> {
	_flushPendingSteps(runId);
	const db = _openDb(projectId);
	db.prepare(`UPDATE run_steps SET outcome = 'failed' WHERE runId = ? AND stepIndex = ?`)
		.run(runId, stepIndex);
}

/** Marks a run as finished (sets `endedAt`). Flushes first, same reason as recordStepFailure. Only called on a natural finish or a caught failure — never on user-stop or crash, so those stay recoverable as "never finished". The pass/fail verdict itself is never cached here — it's always derived by iterating `run_steps` (see `getLastRunForRecording`), since playback continues past soft-assertion mismatches and a cached run-level flag would drift from the per-step reality. */
async function finishRun(projectId: ProjectId, runId: RunId): Promise<void> {
	_flushPendingSteps(runId);
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
	// endedAt is only ever set by finishRun, which flushes first — a finished run's run_steps rows
	// are guaranteed to already be on disk, never sitting in the in-memory batch buffer
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
	// a still-running run's tail may only exist in the in-memory batch buffer, not this table yet
	_flushPendingSteps(run.runId);

	const rows = db.prepare(`SELECT stepIndex, outcome FROM run_steps WHERE runId = ?`)
		.all(run.runId) as StepOutcomeRow[];
	const outcomes: Partial<Record<StepIndex, RunOutcome>> = {};
	for (const row of rows) { outcomes[row.stepIndex] = row.outcome; }

	return { finished: run.endedAt !== null, outcomes };
}

export default { startRun, recordStepStart, recordStepFailure, finishRun, flushPendingSteps, getLastRunForRecording, getStepOutcomes, _setSessionsDir };
