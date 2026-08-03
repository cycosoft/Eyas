import { test, expect } from '@playwright/test';
import {
	launchEyas,
	exitEyas,
	getUiView,
	getTestView,
	ensureEnvironmentSelected
} from './eyas-utils.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// Windows refuses to create most paths longer than 260 characters, and Chromium
// nests its per-origin storage deeply beneath the profile root:
//
//   <sessionData>/Partitions/<partition>/IndexedDB/https_<host>_0.indexeddb.leveldb/MANIFEST-000001
//
// EYAS-334 put a raw 64-character projectId and 36-character testId into
// `sessionData`, which left too few characters for that suffix. leveldb would create
// its LOCK and LOG, then fail the MANIFEST write — surfacing inside the app under
// test as an opaque IndexedDB `UnknownError` (and, via Dexie, three silent retries
// before it gave up). Service Worker script caches and Shared Dictionary nest just as
// deeply and failed the same way.
//
// The two tests below do different jobs, and it is worth being precise about which
// one is the regression guard:
//
//   - The IndexedDB test is a liveness check. It exercises the real Chromium storage
//     stack in the real test layer, which no unit-level mock of `session`/`app.getPath`
//     can do. But the demo project's ids are shorter than a production build's, so it
//     stayed green against the original bug — it does not, on its own, prove the fix.
//   - The budget test is the red/green guard. Measured against the running app, it
//     fails at 268 characters under the pre-fix derivation and passes after it.
//
// Non-Windows platforms have no such cap, so both pass trivially there — expected,
// not a gap.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deepest per-origin layout Chromium creates beneath the profile root, with the
 * partition directory spelled out (`<8-char scope hash>-test`) so the measurement
 * covers every segment Eyas contributes, not just `sessionData`.
 */
const CHROMIUM_STORAGE_SUFFIX = `/Partitions/00000000-test/IndexedDB/https__0.indexeddb.leveldb/MANIFEST-000001`.length;
const WINDOWS_MAX_PATH = 260;

/** A realistic long hostname for a staging app — the shape that first broke. */
const REPRESENTATIVE_HOST_LENGTH = `local-client-viewer.dev.hawksoft.app`.length;

test.describe(`Deep Chromium storage paths`, () => {
	let electronApp;

	test.beforeEach(async () => {
		electronApp = await launchEyas();
	});

	test.afterEach(async () => {
		await exitEyas(electronApp);
	});

	test(`the test layer can open, write to, and read back an IndexedDB database`, async () => {
		test.setTimeout(30000);

		const uiPage = await getUiView(electronApp);
		await ensureEnvironmentSelected(uiPage);

		const testPage = await getTestView(electronApp, /eyas\.cycosoft\.com\/?$/);
		expect(testPage, `the demo test layer should be loaded`).toBeTruthy();

		// Drives the same code path Dexie does: open() forces leveldb to create its
		// MANIFEST, which is the write that failed once the profile path grew too long.
		const outcome = await testPage.evaluate(() => new Promise(resolve => {
			const request = indexedDB.open(`eyas-path-length-probe`, 1);

			request.onupgradeneeded = () => request.result.createObjectStore(`probe`);
			request.onerror = () => resolve({ ok: false, error: request.error?.name, message: request.error?.message });
			request.onsuccess = () => {
				const db = request.result;
				const tx = db.transaction(`probe`, `readwrite`);
				tx.objectStore(`probe`).put(`stored-value`, `key`);
				tx.onerror = () => resolve({ ok: false, error: tx.error?.name, message: tx.error?.message });
				tx.oncomplete = () => {
					const read = db.transaction(`probe`, `readonly`).objectStore(`probe`).get(`key`);
					read.onerror = () => resolve({ ok: false, error: read.error?.name });
					read.onsuccess = () => resolve({ ok: true, value: read.result });
				};
			};
		}));

		expect(outcome, `IndexedDB must open inside the test layer`).toEqual({ ok: true, value: `stored-value` });
	});

	test(`the profile path leaves room for a realistic host under Windows' 260-character cap`, async () => {
		const sessionDataDir = await electronApp.evaluate(({ app }) => app.getPath(`sessionData`));

		// Measured against the running app rather than a constructed path, so a change
		// to how the profile directory is derived is caught here even if the unit-level
		// budget test is updated alongside it.
		const deepestPath = sessionDataDir.length + CHROMIUM_STORAGE_SUFFIX + REPRESENTATIVE_HOST_LENGTH;

		expect(
			deepestPath,
			`sessionData (${sessionDataDir.length} chars) leaves too little room for Chromium's per-origin storage`
		).toBeLessThan(WINDOWS_MAX_PATH);
	});
});
