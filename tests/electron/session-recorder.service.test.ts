import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { remove, readJson, pathExists, outputJson } from 'fs-extra';
import type { CoreContext } from '@registry/eyas-core.js';
import type { FilePath, SchemaVersion } from '@registry/primitives.js';
import type { EyasRecordingEnvelope } from '@registry/recording.js';

vi.mock(`electron`, () => ({
	app: {
		getPath: vi.fn().mockReturnValue(`/unused-mock-user-data`)
	}
}));

import service from '@core/session-recorder.service.js';
import runHistoryService from '@core/run-history.service.js';

let tmpDir: FilePath;

function makeCtx(overrides: Partial<CoreContext> = {}): CoreContext {
	return {
		$config: { meta: { projectId: `test-proj`, testId: `test-run` } },
		$currentViewport: [1024, 768],
		$eyasLayer: { webContents: { send: vi.fn() } },
		...overrides
	} as unknown as CoreContext;
}

beforeEach(() => {
	tmpDir = join(tmpdir(), `eyas-session-recorder-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	service._setSessionsDir(tmpDir);
	runHistoryService._setSessionsDir(tmpDir);
});

afterEach(async () => {
	service._setSessionsDir(null);
	runHistoryService._setSessionsDir(null);
	await remove(tmpDir).catch(() => { });
});

// ─── _setSessionsDir ────────────────────────────────────────────────────────

describe(`sessionRecorderService._setSessionsDir`, () => {
	test(`resets this instance back to idle, so a leftover in-progress recording from a prior test can't leak into the next one`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);

		service._setSessionsDir(tmpDir);

		service.appendSteps([{ type: `click`, selectors: [`#foo`], offsetX: 1, offsetY: 2, timestamp: Date.now() }] as never);
		expect(service.getActiveSession()).toBeNull();
	});
});

// ─── startSession ─────────────────────────────────────────────────────────────

describe(`sessionRecorderService.startSession`, () => {
	test(`creates a new EyasRecordingEnvelope in memory with a fresh sessionId, ISO timestamp title, and empty steps[]`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);

		const session = service.getActiveSession();
		expect(session).not.toBeNull();
		expect(session?.sessionId).toBeTypeOf(`string`);
		expect(session?.sessionId.length).toBeGreaterThan(0);
		expect(() => new Date(session?.title ?? ``).toISOString()).not.toThrow();
		expect(session?.recording.steps).toEqual([]);
	});

	test(`writes the session file to disk immediately at {userData}/sessions/{projectId}/{sessionId}.json`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);

		const session = service.getActiveSession();
		const expectedPath = join(tmpDir, `test-proj`, `${session?.sessionId}.json`);

		expect(await pathExists(expectedPath)).toBe(true);
		const written = await readJson(expectedPath);
		expect(written.status).toBeUndefined();
		expect(written.sessionId).toBe(session?.sessionId);
	});

	test(`marks this instance as recording, so appendSteps accepts steps immediately after starting`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);

		service.appendSteps([{ type: `click`, selectors: [`#foo`], offsetX: 1, offsetY: 2, timestamp: Date.now() }] as never);

		expect(service.getActiveSession()?.recording.steps).toHaveLength(1);
	});

	test(`writes each new recording to its own file rather than overwriting a previous one, since every session is keyed by its own sessionId`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		const firstSessionId = service.getActiveSession()?.sessionId;

		await service.startSession(ctx);
		const secondSessionId = service.getActiveSession()?.sessionId;

		expect(await pathExists(join(tmpDir, `test-proj`, `${firstSessionId}.json`))).toBe(true);
		expect(await pathExists(join(tmpDir, `test-proj`, `${secondSessionId}.json`))).toBe(true);
		expect(firstSessionId).not.toBe(secondSessionId);
	});

	test(`sends recorder-status-updated to the eyas layer with { isRecording: true, sessionId }`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);

		const session = service.getActiveSession();
		expect(ctx.$eyasLayer?.webContents?.send).toHaveBeenCalledWith(`recorder-status-updated`, { isRecording: true, sessionId: session?.sessionId });
	});
});

// ─── appendSteps ────────────────────────────────────────────────────────────

describe(`sessionRecorderService.appendSteps`, () => {
	test(`is a no-op after stopRecording, so steps flushed post-stop aren't appended to the already-stopped session`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		service.stopRecording(ctx);

		service.appendSteps([{ type: `click`, selectors: [`#foo`], offsetX: 1, offsetY: 2, timestamp: Date.now() }] as never);

		expect(service.getActiveSession()?.recording.steps).toHaveLength(0);
	});

	test(`appends flushed steps to the in-memory steps[] array of the current envelope`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);

		service.appendSteps([{ type: `click`, selectors: [`#foo`], offsetX: 1, offsetY: 2, timestamp: Date.now() }] as never);

		expect(service.getActiveSession()?.recording.steps).toHaveLength(1);
	});

	test(`writes the full envelope to disk using fs-extra outputJson after appending`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		const expectedPath = join(tmpDir, `test-proj`, `${service.getActiveSession()?.sessionId}.json`);

		service.appendSteps([{ type: `click`, selectors: [`#foo`], offsetX: 1, offsetY: 2, timestamp: Date.now() }] as never);
		await new Promise(resolve => setTimeout(resolve, 20));

		const written = await readJson(expectedPath);
		expect(written.recording.steps).toHaveLength(1);
	});

	test(`sequentializes writes so concurrent flushes do not race (mirrors settings-service.ts save() queue pattern)`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		const expectedPath = join(tmpDir, `test-proj`, `${service.getActiveSession()?.sessionId}.json`);

		for (let i = 0; i < 10; i++) {
			service.appendSteps([{ type: `click`, selectors: [`#${i}`], offsetX: 0, offsetY: 0, timestamp: Date.now() }] as never);
		}
		await new Promise(resolve => setTimeout(resolve, 50));

		expect(service.getActiveSession()?.recording.steps).toHaveLength(10);
		const written = await readJson(expectedPath);
		expect(written.recording.steps).toHaveLength(10);
	});
});

// ─── appendNavigateStep ─────────────────────────────────────────────────────

describe(`sessionRecorderService.appendNavigateStep`, () => {
	test(`appends a NavigateStep with the given url and current timestamp to the in-memory session`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);

		service.appendNavigateStep(`https://example.com` as never);

		const steps = service.getActiveSession()?.recording.steps;
		expect(steps).toHaveLength(1);
		expect(steps?.[0]).toMatchObject({ type: `navigate`, url: `https://example.com` });
		expect(steps?.[0].timestamp).toBeTypeOf(`number`);
	});

	test(`is a no-op while a replay is in progress, so the replayed navigation isn't re-recorded into the session it's replaying`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);

		service.setReplaying(true);
		service.appendNavigateStep(`https://example.com` as never);
		service.setReplaying(false);

		expect(service.getActiveSession()?.recording.steps).toHaveLength(0);
	});

	test(`is a no-op after stopRecording, so navigation to a new view after stopping isn't appended to the already-stopped session`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		service.stopRecording(ctx);

		service.appendNavigateStep(`https://example.com` as never);

		expect(service.getActiveSession()?.recording.steps).toHaveLength(0);
	});
});

// ─── appendCloseWindowStep ──────────────────────────────────────────────────

describe(`sessionRecorderService.appendCloseWindowStep`, () => {
	test(`appends a CloseWindowStep with the given popupId and current timestamp to the in-memory session`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);

		service.appendCloseWindowStep(`popup-1` as never);

		const steps = service.getActiveSession()?.recording.steps;
		expect(steps).toHaveLength(1);
		expect(steps?.[0]).toMatchObject({ type: `closeWindow`, popupId: `popup-1` });
		expect(steps?.[0].timestamp).toBeTypeOf(`number`);
	});

	test(`is a no-op while a replay is in progress, so the replayed popup close isn't re-recorded into the session it's replaying`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);

		service.setReplaying(true);
		service.appendCloseWindowStep(`popup-1` as never);
		service.setReplaying(false);

		expect(service.getActiveSession()?.recording.steps).toHaveLength(0);
	});

	test(`is a no-op after stopRecording, so a popup closing after stopping isn't appended to the already-stopped session`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		service.stopRecording(ctx);

		service.appendCloseWindowStep(`popup-1` as never);

		expect(service.getActiveSession()?.recording.steps).toHaveLength(0);
	});
});

// ─── getSession ─────────────────────────────────────────────────────────────

describe(`sessionRecorderService.getSession`, () => {
	test(`returns the in-memory active session when its sessionId matches`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		const session = service.getActiveSession();

		const loaded = await service.getSession(ctx, session?.sessionId as never);
		expect(loaded).toBe(session);
	});

	test(`reads the session from disk by projectId when it isn't the active in-memory session`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		const sessionId = service.getActiveSession()?.sessionId ?? ``;

		// re-pointing at the same dir clears in-memory state (see _setSessionsDir), forcing a genuine disk read
		service._setSessionsDir(tmpDir);

		const loaded = await service.getSession(ctx, sessionId as never);
		expect(loaded?.sessionId).toBe(sessionId);
	});

	test(`returns null when no session exists on disk for the given sessionId`, async () => {
		const ctx = makeCtx();
		const loaded = await service.getSession(ctx, `does-not-exist` as never);
		expect(loaded).toBeNull();
	});

	test(`reads a stopped session written directly to sessions/{projectId}/{sessionId}.json when the id doesn't match the current active session`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);

		const stoppedPath = join(tmpDir, `test-proj`, `stopped-session-id.json`);
		await outputJson(stoppedPath, { sessionId: `stopped-session-id` });

		const loaded = await service.getSession(ctx, `stopped-session-id` as never);
		expect(loaded?.sessionId).toBe(`stopped-session-id`);
	});

	test(`returns null for a stale id that matches neither the active session nor one on disk`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);

		const loaded = await service.getSession(ctx, `some-old-unrelated-id` as never);
		expect(loaded).toBeNull();
	});
});

// ─── listSessions ───────────────────────────────────────────────────────────

describe(`sessionRecorderService.listSessions`, () => {
	test(`returns an empty list when the project has never recorded a session`, async () => {
		const ctx = makeCtx();
		const sessions = await service.listSessions(ctx);
		expect(sessions).toEqual([]);
	});

	test(`lists a summary for each session file directly under the project, newest first`, async () => {
		const ctx = makeCtx();
		await outputJson(join(tmpDir, `test-proj`, `session-a.json`), {
			sessionId: `session-a`, title: `2024-01-01T00:00:00.000Z`,
			startedAt: 1000, stoppedAt: 2000, recording: { steps: [{ type: `navigate`, url: `x`, timestamp: 1 }] }
		});
		await outputJson(join(tmpDir, `test-proj`, `session-b.json`), {
			sessionId: `session-b`, title: `2024-02-01T00:00:00.000Z`,
			startedAt: 5000, stoppedAt: null, recording: { steps: [] }
		});

		const sessions = await service.listSessions(ctx);

		expect(sessions).toEqual([
			{ sessionId: `session-b`, title: `2024-02-01T00:00:00.000Z`, startedAt: 5000, stoppedAt: null, stepCount: 0, lastRunOutcome: null },
			{ sessionId: `session-a`, title: `2024-01-01T00:00:00.000Z`, startedAt: 1000, stoppedAt: 2000, stepCount: 1, lastRunOutcome: null }
		]);
	});

	test(`skips a malformed session file instead of failing the whole listing`, async () => {
		const ctx = makeCtx();
		await outputJson(join(tmpDir, `test-proj`, `session-good.json`), {
			sessionId: `session-good`, title: `2024-01-01T00:00:00.000Z`,
			startedAt: 1000, stoppedAt: 2000, recording: { steps: [] }
		});
		// missing 'recording' throws when the service reads .recording.steps.length — the case a
		// truncated or hand-edited file produces
		await outputJson(join(tmpDir, `test-proj`, `session-bad.json`), { sessionId: `session-bad` });

		const sessions = await service.listSessions(ctx);

		expect(sessions.map(s => s.sessionId)).toEqual([`session-good`]);
	});

	test(`ignores leftover legacy testId directories from before recordings were scoped by projectId only`, async () => {
		const ctx = makeCtx();
		await outputJson(join(tmpDir, `test-proj`, `session-flat.json`), {
			sessionId: `session-flat`, title: `2024-03-01T00:00:00.000Z`,
			startedAt: 9000, stoppedAt: 9500, recording: { steps: [] }
		});
		await outputJson(join(tmpDir, `test-proj`, `old-test-run`, `active-session.json`), {
			sessionId: `legacy-session`, title: `2024-03-01T00:00:00.000Z`,
			startedAt: 9000, stoppedAt: null, recording: { steps: [] }
		});

		const sessions = await service.listSessions(ctx);

		expect(sessions.map(s => s.sessionId)).toEqual([`session-flat`]);
	});
});

// ─── stopRecording ──────────────────────────────────────────────────────────

describe(`sessionRecorderService.stopRecording`, () => {
	test(`sets stoppedAt to the current timestamp on the session file and returns this instance to idle`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		const expectedPath = join(tmpDir, `test-proj`, `${service.getActiveSession()?.sessionId}.json`);

		service.stopRecording(ctx);
		await new Promise(resolve => setTimeout(resolve, 20));

		expect(service.getActiveSession()?.stoppedAt).toBeTypeOf(`number`);

		const written = await readJson(expectedPath);
		expect(written.status).toBeUndefined();

		// once idle, further steps aren't appended — proves _mode gated the write, not just a stale check
		service.appendSteps([{ type: `click`, selectors: [`#foo`], offsetX: 1, offsetY: 2, timestamp: Date.now() }] as never);
		expect(service.getActiveSession()?.recording.steps).toHaveLength(0);
	});

	test(`sends recorder-status-updated with { isRecording: false }`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		vi.mocked(ctx.$eyasLayer?.webContents?.send as ReturnType<typeof vi.fn>).mockClear();

		service.stopRecording(ctx);

		expect(ctx.$eyasLayer?.webContents?.send).toHaveBeenCalledWith(`recorder-status-updated`, expect.objectContaining({ isRecording: false }));
	});
});

// ─── isUnknownSchema ──────────────────────────────────────────────────────────

/**
 * Builds an envelope carrying an arbitrary version string. The cast is the point of the guard: the
 * envelope type says only the known versions exist, and a file written by a newer build is exactly
 * the case that breaks that assumption.
 */
function makeVersionedSession(version: SchemaVersion): EyasRecordingEnvelope {
	return {
		eyasSchemaVersion: version,
		projectId: `test-proj`,
		sessionId: `sess-1`,
		title: `t`,
		startedAt: 0,
		stoppedAt: 1,
		startUrl: null,
		viewport: { width: 1024, height: 768 },
		components: {},
		recording: { title: `t`, steps: [] }
	} as unknown as EyasRecordingEnvelope;
}

describe(`sessionRecorderService.isUnknownSchema`, () => {
	test.each([`1.0.0`, `1.1.0`, `1.2.0`])(`accepts %s, a version this build can read`, version => {
		expect(service.isUnknownSchema(makeVersionedSession(version))).toBe(false);
	});

	test(`flags a session written by a newer build, which is what the guard exists for`, () => {
		// the concrete hazard: 1.2.0's editableInput steps are skipped by a 1.1.0 build, so a rich-text
		// editor replays empty. The next bump will do the same to this build unless it says so first
		expect(service.isUnknownSchema(makeVersionedSession(`1.3.0`))).toBe(true);
	});

	test.each([
		[`a missing version`, undefined],
		[`an empty version`, ``],
		[`a truncated version`, `1.2`],
		[`a non-numeric version`, `next`]
	])(`flags %s rather than treating it as readable`, (_label, version) => {
		// membership, not ordering, is what catches these — an ordered compare parses them to NaN, and
		// every NaN comparison is false, so all four would pass silently as "not newer than us"
		expect(service.isUnknownSchema(makeVersionedSession(version as SchemaVersion))).toBe(true);
	});

	test(`accepts the version startSession actually writes, so a fresh recording never self-warns`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);

		const session = service.getActiveSession();
		expect(session).not.toBeNull();
		expect(service.isUnknownSchema(session as EyasRecordingEnvelope)).toBe(false);
	});
});
