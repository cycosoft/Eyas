import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { remove, ensureDirSync } from 'fs-extra';
import { DatabaseSync } from 'node:sqlite';
import type { FilePath } from '@registry/primitives.js';

vi.mock(`electron`, () => ({
	app: { getPath: vi.fn().mockReturnValue(`/unused-mock-user-data`) }
}));

import service from '@core/run-history.service.js';

let tmpDir: FilePath;

beforeEach(() => {
	tmpDir = join(tmpdir(), `eyas-run-history-test-${Date.now()}-${Math.random().toString(36).slice(2)}`) as FilePath;
	service._setSessionsDir(tmpDir);
});

afterEach(async () => {
	service._setSessionsDir(null);
	await remove(tmpDir).catch(() => { });
});

describe(`runHistoryService.getLastRunForRecording`, () => {
	test(`returns null for a recording that has never been played`, async () => {
		const result = await service.getLastRunForRecording(`proj-1`, `rec-1`);
		expect(result).toBeNull();
	});

	test(`round-trips a run that starts, records steps, and finishes as passed`, async () => {
		const runId = await service.startRun(`proj-1`, `rec-1`);
		await service.recordStepStart(`proj-1`, runId, 0);
		await service.recordStepStart(`proj-1`, runId, 1);
		await service.finishRun(`proj-1`, runId);

		const result = await service.getLastRunForRecording(`proj-1`, `rec-1`);
		expect(result).toEqual({ outcome: `passed` });
	});

	test(`derives a failed outcome from a step marked failed, even though the run finished`, async () => {
		const runId = await service.startRun(`proj-1`, `rec-1`);
		await service.recordStepStart(`proj-1`, runId, 0);
		await service.recordStepStart(`proj-1`, runId, 1);
		await service.recordStepFailure(`proj-1`, runId, 1);
		await service.finishRun(`proj-1`, runId);

		const result = await service.getLastRunForRecording(`proj-1`, `rec-1`);
		expect(result).toEqual({ outcome: `failed` });
	});

	test(`surfaces a run that never called finishRun (crash or user stop) as failed, since it never completed`, async () => {
		const runId = await service.startRun(`proj-1`, `rec-1`);
		await service.recordStepStart(`proj-1`, runId, 0);

		const result = await service.getLastRunForRecording(`proj-1`, `rec-1`);
		expect(result).toEqual({ outcome: `failed` });
	});

	test(`returns the most recently started run for a recording, not the first one ever played`, async () => {
		const firstRunId = await service.startRun(`proj-1`, `rec-1`);
		await service.recordStepStart(`proj-1`, firstRunId, 0);
		await service.recordStepFailure(`proj-1`, firstRunId, 0);
		await service.finishRun(`proj-1`, firstRunId);
		const secondRunId = await service.startRun(`proj-1`, `rec-1`);
		await service.finishRun(`proj-1`, secondRunId);

		const result = await service.getLastRunForRecording(`proj-1`, `rec-1`);
		expect(result).toEqual({ outcome: `passed` });
	});

	test(`keeps run history isolated per project, even for the same recordingId`, async () => {
		const runId = await service.startRun(`proj-1`, `rec-1`);
		await service.finishRun(`proj-1`, runId);

		const result = await service.getLastRunForRecording(`proj-2`, `rec-1`);
		expect(result).toBeNull();
	});
});

describe(`runHistoryService.recordStepStart batching`, () => {
	test(`does not require an explicit flush to see fewer than a full batch's steps — read paths flush what's pending`, async () => {
		const runId = await service.startRun(`proj-1`, `rec-1`);
		for (let i = 0; i < 3; i++) { await service.recordStepStart(`proj-1`, runId, i); }
		await service.finishRun(`proj-1`, runId);

		const result = await service.getStepOutcomes(`proj-1`, `rec-1`);
		expect(result).toEqual({ finished: true, outcomes: { 0: `passed`, 1: `passed`, 2: `passed` } });
	});

	test(`flushPendingSteps makes an in-progress run's steps readable before finishRun is ever called`, async () => {
		const runId = await service.startRun(`proj-1`, `rec-1`);
		await service.recordStepStart(`proj-1`, runId, 0);
		await service.recordStepStart(`proj-1`, runId, 1);
		await service.flushPendingSteps(runId);

		const result = await service.getStepOutcomes(`proj-1`, `rec-1`);
		expect(result).toEqual({ finished: false, outcomes: { 0: `passed`, 1: `passed` } });
	});

	test(`writing 12 steps auto-flushes the first batch of 10 and finishRun flushes the remaining 2`, async () => {
		const runId = await service.startRun(`proj-1`, `rec-1`);
		for (let i = 0; i < 12; i++) { await service.recordStepStart(`proj-1`, runId, i); }
		await service.finishRun(`proj-1`, runId);

		const result = await service.getStepOutcomes(`proj-1`, `rec-1`);
		expect(result?.finished).toBe(true);
		expect(Object.keys(result?.outcomes ?? {})).toHaveLength(12);
		for (let i = 0; i < 12; i++) { expect(result?.outcomes[i]).toBe(`passed`); }
	});

	test(`a stopped/aborted run still records every step it reached once flushed, not just full batches`, async () => {
		const runId = await service.startRun(`proj-1`, `rec-1`);
		await service.recordStepStart(`proj-1`, runId, 0);
		await service.recordStepStart(`proj-1`, runId, 1);
		// no finishRun — this simulates a user-stopped run, which only flushes explicitly
		await service.flushPendingSteps(runId);

		const result = await service.getStepOutcomes(`proj-1`, `rec-1`);
		expect(result).toEqual({ finished: false, outcomes: { 0: `passed`, 1: `passed` } });
	});
});

describe(`runHistoryService.getStepOutcomes`, () => {
	test(`returns null for a recording that has never been played`, async () => {
		const result = await service.getStepOutcomes(`proj-1`, `rec-1`);
		expect(result).toBeNull();
	});

	test(`returns finished:true with each step's outcome for a completed run`, async () => {
		const runId = await service.startRun(`proj-1`, `rec-1`);
		await service.recordStepStart(`proj-1`, runId, 0);
		await service.recordStepStart(`proj-1`, runId, 1);
		await service.recordStepFailure(`proj-1`, runId, 1);
		await service.finishRun(`proj-1`, runId);

		const result = await service.getStepOutcomes(`proj-1`, `rec-1`);
		expect(result).toEqual({ finished: true, outcomes: { 0: `passed`, 1: `failed` } });
	});

	test(`returns finished:false for a run that never called finishRun, even though some steps recorded`, async () => {
		const runId = await service.startRun(`proj-1`, `rec-1`);
		await service.recordStepStart(`proj-1`, runId, 0);

		const result = await service.getStepOutcomes(`proj-1`, `rec-1`);
		expect(result).toEqual({ finished: false, outcomes: { 0: `passed` } });
	});

	test(`reflects the most recently started run's steps, not an earlier run's`, async () => {
		const firstRunId = await service.startRun(`proj-1`, `rec-1`);
		await service.recordStepStart(`proj-1`, firstRunId, 0);
		await service.recordStepFailure(`proj-1`, firstRunId, 0);
		await service.finishRun(`proj-1`, firstRunId);

		const secondRunId = await service.startRun(`proj-1`, `rec-1`);
		await service.recordStepStart(`proj-1`, secondRunId, 0);
		await service.finishRun(`proj-1`, secondRunId);

		const result = await service.getStepOutcomes(`proj-1`, `rec-1`);
		expect(result).toEqual({ finished: true, outcomes: { 0: `passed` } });
	});

	test(`migrates a pre-existing runs.sqlite created before the outcome column existed, instead of throwing 'no such column: outcome'`, async () => {
		const projectDir = join(tmpDir, `proj-1`);
		ensureDirSync(projectDir);
		const legacyDb = new DatabaseSync(join(projectDir, `runs.sqlite`));
		legacyDb.exec(`
			CREATE TABLE runs (runId TEXT PRIMARY KEY, recordingId TEXT NOT NULL, startedAt INTEGER NOT NULL, endedAt INTEGER);
			CREATE TABLE run_steps (runId TEXT NOT NULL, stepIndex INTEGER NOT NULL, happenedAt INTEGER NOT NULL);
		`);
		legacyDb.close();

		const runId = await service.startRun(`proj-1`, `rec-1`);
		await service.recordStepStart(`proj-1`, runId, 0);
		await service.finishRun(`proj-1`, runId);

		const result = await service.getStepOutcomes(`proj-1`, `rec-1`);
		expect(result).toEqual({ finished: true, outcomes: { 0: `passed` } });
	});
});
