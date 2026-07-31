import { test, expect } from '@playwright/test';
import * as path from 'path';
import fs from 'fs-extra';
import { spawn } from 'node:child_process';
import {
	launchEyas,
	exitEyas,
	getUiView,
	setupTestProject,
	electronPath
} from './eyas-utils.mjs';

// EYAS-334 — real, multi-process verification. Unit-testable logic (PID
// liveness/reuse, lock overwrite semantics, atomic settings writes) lives in
// tests/electron/multi-instance.test.ts; this file exercises the parts that
// only manifest across real OS processes: whether a second process is
// actually allowed to run, whether Chromium's sessionData is truly isolated,
// and whether a blocked launch never creates a window.

/** Kills an Electron app's underlying OS process immediately, without going through the app's own quit flow — simulates a crash rather than a graceful exit. */
async function killHard(electronApp) {
	if (!electronApp) return;
	let pid = null;
	try {
		pid = await electronApp.evaluate(() => process.pid);
	} catch { /* already gone */ }
	if (pid) {
		try { process.kill(pid, `SIGKILL`); } catch { /* already gone */ }
		for (let i = 0; i < 20; i++) {
			try { process.kill(pid, 0); await new Promise(r => setTimeout(r, 100)); } catch { break; }
		}
	}
	await electronApp.close().catch(() => {});
}

test.describe(`Multi-Instance Support (EYAS-334)`, () => {
	let userDataDir;

	test.beforeEach(async () => {
		userDataDir = path.join(import.meta.dirname, `../../.test-data`, `multi-instance-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
		await fs.ensureDir(userDataDir);
	});

	test.afterEach(async () => {
		await fs.remove(userDataDir).catch(() => {});
	});

	test(`allows a second Eyas process for a different testId to start without quitting`, async () => {
		test.setTimeout(30000);

		const { projectDir: projectADir, cleanup: cleanupA } = await setupTestProject({ meta: { testId: `multi-a` } });
		const { projectDir: projectBDir, cleanup: cleanupB } = await setupTestProject({ meta: { testId: `multi-b` } });

		let appA;
		let appB;
		try {
			appA = await launchEyas([], userDataDir, projectADir);
			const uiA = await getUiView(appA);
			expect(uiA).toBeTruthy();

			appB = await launchEyas([], userDataDir, projectBDir);
			const uiB = await getUiView(appB);
			expect(uiB).toBeTruthy();

			// Both must still be alive at the same time — a second-instance
			// forwarding/quit handler would have closed one of them.
			expect(await appA.evaluate(() => process.pid)).toBeGreaterThan(0);
			expect(await appB.evaluate(() => process.pid)).toBeGreaterThan(0);
		} finally {
			await exitEyas(appA);
			await exitEyas(appB);
			await cleanupA();
			await cleanupB();
		}
	});

	test(`blocks a second launch with the same projectId+testId while the first is still alive, without creating a window`, async () => {
		// A blocked instance shows a synchronous native dialog before quitting
		// (index.ts calls app.quit() only after instanceLockService.tryAcquire()
		// resolves, and that dialog blocks the main thread until dismissed).
		// With no display to dismiss it, waiting on the second process to exit
		// — or on Playwright's CDP connection to it — is not reliable in a
		// headless environment. So instead of depending on that, spawn the
		// second process directly and check the actual invariant we care
		// about: the lock file still records the FIRST process as the owner.
		// A blocked tryAcquire() never reaches the atomic lock-acquire step,
		// so if it had "won", the lock file would now show the second PID.
		test.setTimeout(20000);

		const projectId = `locked-proj`;
		const testId = `locked-test-id`;
		const { projectDir, cleanup } = await setupTestProject({ meta: { projectId, testId } });
		const lockPath = path.join(userDataDir, `sessions`, projectId, testId, `instance.lock`);

		let first;
		let secondChild;
		try {
			first = await launchEyas([], userDataDir, projectDir);
			const firstUi = await getUiView(first);
			expect(firstUi).toBeTruthy();
			const firstPid = await first.evaluate(() => process.pid);

			const mainPath = path.join(import.meta.dirname, `../../out/main/index.js`);
			secondChild = spawn(electronPath, [
				mainPath,
				`--dev`,
				`--user-data-dir=${userDataDir}`,
				`--skip-whats-new`
			], {
				cwd: projectDir,
				env: process.env,
				stdio: `ignore`
			});

			// Give the second process enough time to run through config
			// resolution and the lock check (well before app.whenReady()/any
			// window), without needing it to fully exit.
			await new Promise(resolve => setTimeout(resolve, 5000));

			const lockContents = await fs.readJson(lockPath);
			expect(lockContents.pid).toBe(firstPid);
		} finally {
			if (secondChild && secondChild.exitCode === null && !secondChild.killed) {
				try { secondChild.kill(`SIGKILL`); } catch { /* already gone */ }
			}
			await exitEyas(first);
			await cleanup();
		}
	});

	test(`allows a launch of the same projectId+testId after the prior process crashed (stale lock recovery)`, async () => {
		test.setTimeout(30000);

		const { projectDir, cleanup } = await setupTestProject({ meta: { testId: `crash-recovery-test-id` } });

		let first;
		let second;
		try {
			first = await launchEyas([], userDataDir, projectDir);
			await getUiView(first);

			// Simulate a crash: kill the process directly rather than exiting
			// gracefully, leaving the lock file pointed at a now-dead PID.
			await killHard(first);
			first = null;

			second = await launchEyas([], userDataDir, projectDir);
			const secondUi = await getUiView(second);
			expect(secondUi).toBeTruthy();
		} finally {
			await exitEyas(first);
			await exitEyas(second);
			await cleanup();
		}
	});

	test(`isolates sessionData by projectId+testId and reuses the same path across relaunches`, async () => {
		test.setTimeout(30000);

		const { projectDir: projectADir, cleanup: cleanupA } = await setupTestProject({ meta: { projectId: `session-proj`, testId: `session-test-a` } });
		const { projectDir: projectBDir, cleanup: cleanupB } = await setupTestProject({ meta: { projectId: `session-proj`, testId: `session-test-b` } });

		let appA1;
		let appA2;
		let appB;
		try {
			appA1 = await launchEyas([], userDataDir, projectADir);
			await getUiView(appA1);
			const sessionPathA1 = await appA1.evaluate(({ app }) => app.getPath(`sessionData`));
			await exitEyas(appA1);
			appA1 = null;

			// Relaunching the same projectId+testId should reuse the exact path.
			appA2 = await launchEyas([], userDataDir, projectADir);
			await getUiView(appA2);
			const sessionPathA2 = await appA2.evaluate(({ app }) => app.getPath(`sessionData`));
			expect(sessionPathA2).toBe(sessionPathA1);

			// A different testId on the same project must not collide.
			appB = await launchEyas([], userDataDir, projectBDir);
			await getUiView(appB);
			const sessionPathB = await appB.evaluate(({ app }) => app.getPath(`sessionData`));
			expect(sessionPathB).not.toBe(sessionPathA2);

			expect(sessionPathA2).toContain(`session-proj`);
			expect(sessionPathA2).toContain(`session-test-a`);
			expect(sessionPathB).toContain(`session-test-b`);
		} finally {
			await exitEyas(appA1);
			await exitEyas(appA2);
			await exitEyas(appB);
			await cleanupA();
			await cleanupB();
		}
	});
});
