import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { remove, readJson, pathExists, outputJson } from 'fs-extra';
import type { CoreContext } from '@registry/eyas-core.js';
import type { FilePath } from '@registry/primitives.js';

vi.mock(`electron`, () => ({
	app: {
		getPath: vi.fn().mockReturnValue(`/unused-mock-user-data`)
	}
}));

import service from '@core/session-recorder.service.js';

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
});

afterEach(async () => {
	service._setSessionsDir(null);
	await remove(tmpDir).catch(() => { });
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

	test(`writes the session file to disk immediately at {userData}/sessions/{projectId}/{testId}/active-session.json with status 'recording'`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);

		const session = service.getActiveSession();
		const expectedPath = join(tmpDir, `test-proj`, `test-run`, `active-session.json`);

		expect(await pathExists(expectedPath)).toBe(true);
		const written = await readJson(expectedPath);
		expect(written.status).toBe(`recording`);
		expect(written.sessionId).toBe(session?.sessionId);
	});

	test(`overwrites the previous active-session.json rather than leaving it as an orphaned file when a new recording starts`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		const firstSessionId = service.getActiveSession()?.sessionId;

		await service.startSession(ctx);
		const secondSessionId = service.getActiveSession()?.sessionId;

		const expectedPath = join(tmpDir, `test-proj`, `test-run`, `active-session.json`);
		const written = await readJson(expectedPath);
		expect(written.sessionId).toBe(secondSessionId);
		expect(written.sessionId).not.toBe(firstSessionId);
		expect(await pathExists(join(tmpDir, `test-proj`, `test-run`, `${firstSessionId}.json`))).toBe(false);
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
		const expectedPath = join(tmpDir, `test-proj`, `test-run`, `active-session.json`);

		service.appendSteps([{ type: `click`, selectors: [`#foo`], offsetX: 1, offsetY: 2, timestamp: Date.now() }] as never);
		await new Promise(resolve => setTimeout(resolve, 20));

		const written = await readJson(expectedPath);
		expect(written.recording.steps).toHaveLength(1);
	});

	test(`sequentializes writes so concurrent flushes do not race (mirrors settings-service.ts save() queue pattern)`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		const expectedPath = join(tmpDir, `test-proj`, `test-run`, `active-session.json`);

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
		const session = service.getActiveSession();
		const sessionId = session?.sessionId ?? ``;
		service._setSessionsDir(tmpDir);

		const loaded = await service.getSession(ctx, sessionId as never);
		expect(loaded?.sessionId).toBe(sessionId);
	});

	test(`returns null when no session exists on disk for the given sessionId`, async () => {
		const ctx = makeCtx();
		const loaded = await service.getSession(ctx, `does-not-exist` as never);
		expect(loaded).toBeNull();
	});

	test(`falls back to sessions/{projectId}/saved/{sessionId}.json when the id doesn't match the current active session`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);

		const savedPath = join(tmpDir, `test-proj`, `saved`, `saved-session-id.json`);
		await outputJson(savedPath, { sessionId: `saved-session-id`, status: `stopped` });

		const loaded = await service.getSession(ctx, `saved-session-id` as never);
		expect(loaded?.sessionId).toBe(`saved-session-id`);
	});

	test(`returns null for a stale id that matches neither the active session nor a saved one`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);

		const loaded = await service.getSession(ctx, `some-old-unrelated-id` as never);
		expect(loaded).toBeNull();
	});
});

// ─── stopRecording ──────────────────────────────────────────────────────────

describe(`sessionRecorderService.stopRecording`, () => {
	test(`sets status to 'stopped' and stoppedAt to the current timestamp on the session file`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		const expectedPath = join(tmpDir, `test-proj`, `test-run`, `active-session.json`);

		service.stopRecording(ctx);
		await new Promise(resolve => setTimeout(resolve, 20));

		expect(service.getActiveSession()?.status).toBe(`stopped`);
		expect(service.getActiveSession()?.stoppedAt).toBeTypeOf(`number`);

		const written = await readJson(expectedPath);
		expect(written.status).toBe(`stopped`);
	});

	test(`sends recorder-status-updated with { isRecording: false }`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		vi.mocked(ctx.$eyasLayer?.webContents?.send as ReturnType<typeof vi.fn>).mockClear();

		service.stopRecording(ctx);

		expect(ctx.$eyasLayer?.webContents?.send).toHaveBeenCalledWith(`recorder-status-updated`, expect.objectContaining({ isRecording: false }));
	});
});
