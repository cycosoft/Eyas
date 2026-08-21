import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { remove, pathExists } from 'fs-extra';
import type { CoreContext } from '@registry/eyas-core.js';
import type { FilePath, SessionId } from '@registry/primitives.js';

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
	tmpDir = join(tmpdir(), `eyas-session-recorder-delete-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	service._setSessionsDir(tmpDir);
	runHistoryService._setSessionsDir(tmpDir);
});

afterEach(async () => {
	service._setSessionsDir(null);
	runHistoryService._setSessionsDir(null);
	await remove(tmpDir).catch(() => { });
});

describe(`sessionRecorderService.deleteSession`, () => {
	test(`removes a saved recording's file from disk`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		service.appendSteps(ctx, [{ type: `click`, selectors: [`#foo`], offsetX: 1, offsetY: 2, timestamp: Date.now() }] as never);
		const sessionId = service.getActiveSession()?.sessionId as SessionId;
		service.stopRecording(ctx);
		await new Promise(resolve => setTimeout(resolve, 20));
		const expectedPath = join(tmpDir, `test-proj`, `${sessionId}.json`);
		expect(await pathExists(expectedPath)).toBe(true);

		await service.deleteSession(ctx, sessionId);

		expect(await pathExists(expectedPath)).toBe(false);
	});

	test(`clears the in-memory active session when it's the one being deleted, deletes its file, and tells the renderer recording has stopped`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		const sessionId = service.getActiveSession()?.sessionId as SessionId;
		const expectedPath = join(tmpDir, `test-proj`, `${sessionId}.json`);
		vi.mocked(ctx.$eyasLayer?.webContents?.send as ReturnType<typeof vi.fn>).mockClear();

		await service.deleteSession(ctx, sessionId);

		expect(service.getActiveSession()).toBeNull();
		expect(await pathExists(expectedPath)).toBe(false);
		expect(ctx.$eyasLayer?.webContents?.send).toHaveBeenCalledWith(`recorder-status-updated`, { isRecording: false, sessionId });
	});

	test(`leaves an unrelated in-progress recording untouched`, async () => {
		const ctx = makeCtx();
		await service.startSession(ctx);
		const activeSessionId = service.getActiveSession()?.sessionId as SessionId;

		await service.deleteSession(ctx, `some-other-session` as SessionId);

		expect(service.getActiveSession()?.sessionId).toBe(activeSessionId);
	});

	test(`does not throw when the session file is already missing`, async () => {
		const ctx = makeCtx();

		await expect(service.deleteSession(ctx, `never-existed` as SessionId)).resolves.toBeUndefined();
	});
});
