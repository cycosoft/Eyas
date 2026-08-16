import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { remove } from 'fs-extra';
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
