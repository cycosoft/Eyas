import { test, expect } from '@playwright/test';
import * as path from 'path';
import crypto from 'crypto';
import fs from 'fs-extra';
import {
	launchEyas,
	exitEyas,
	getUiView,
	setupTestProject,
	emitIpcMessage,
	invokeIpcHandler
} from './eyas-utils.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// Credentials are stored per `projectId` in `<userData>/credentials.json`, but the
// key that `safeStorage` encrypts them with lives wherever Chromium puts its
// `Local State` file — which is the `sessionData` path. Eyas relocates
// `sessionData` per `projectId/testId` (EYAS-334), so on Windows every session gets
// a fresh random DPAPI-wrapped key and yesterday's ciphertext can never be read
// back. macOS is unaffected because its key comes from the app-wide Keychain.
//
// These tests drive the real IPC handlers so the full encrypt → persist → relaunch
// → decrypt path runs against real platform crypto. The unit suites
// (`credential-store.test.ts`, `ipc-handlers.credentials.test.ts`,
// `test-preload.test.ts`) all mock `safeStorage` or `ipcRenderer`, so none of them
// can observe this.
// ─────────────────────────────────────────────────────────────────────────────

const PROJECT_ID = `credential-persistence`;
const ORIGIN = `https://credentials.example.com`;
const USERNAME = `qa@example.com`;
const PASSWORD = `correct-horse-battery-staple`;

/**
 * Creates a temp project directory pinned to a fixed projectId and an explicit
 * testId, so a test can control whether a relaunch reuses or rotates the
 * `sessionData` sub-directory.
 *
 * @param {string} testId
 * @returns {Promise<string>} Absolute path to the created temp directory
 */
async function createProject(testId) {
	const { projectDir } = await setupTestProject({
		projectId: PROJECT_ID,
		title: `Credential Persistence`,
		domains: [{ url: `https://example.com`, title: `Production` }],
		meta: { projectId: PROJECT_ID, testId }
	});

	return projectDir;
}

/**
 * Saves a credential through the real `save-credential-confirm` listener and waits
 * until `get-credentials` can read it back. Doubles as the sync point for the
 * fire-and-forget `ipcMain.on` write.
 *
 * @param {import('@playwright/test').ElectronApplication} electronApp
 */
async function saveCredentialAndConfirm(electronApp) {
	await emitIpcMessage(electronApp, `save-credential-confirm`, {
		origin: ORIGIN,
		username: USERNAME,
		passwordPlain: PASSWORD
	});

	await expect.poll(
		() => readCredentials(electronApp).then(creds => creds.length),
		{ message: `credential should be readable in the session that saved it`, timeout: 10_000 }
	).toBe(1);
}

/**
 * Reads the stored credentials for ORIGIN back through the real `get-credentials`
 * handler. Entries that fail to decrypt are dropped by the handler, so a shorter
 * list than expected is exactly the user-visible symptom: an empty autofill dropdown.
 *
 * @param {import('@playwright/test').ElectronApplication} electronApp
 * @returns {Promise<Array<{username: string, passwordPlain: string}>>}
 */
async function readCredentials(electronApp) {
	return invokeIpcHandler(electronApp, `get-credentials`, { origin: ORIGIN });
}

test.describe(`Credential persistence across sessions`, () => {
	/** Shared Electron userData dir — this is where `credentials.json` lives */
	let sharedUserDataDir;

	/** Project dirs: same projectId, one with a stable testId and one rotated */
	let originalProjectDir;
	let rotatedTestIdProjectDir;

	const stableTestId = crypto.randomUUID();

	test.beforeAll(async () => {
		sharedUserDataDir = path.join(import.meta.dirname, `../../.test-data`, `credential-user-data-${Date.now()}`);
		await fs.ensureDir(sharedUserDataDir);

		originalProjectDir = await createProject(stableTestId);
		rotatedTestIdProjectDir = await createProject(crypto.randomUUID());
	});

	test.afterAll(async () => {
		await fs.remove(sharedUserDataDir).catch(() => {});
		await fs.remove(originalProjectDir).catch(() => {});
		await fs.remove(rotatedTestIdProjectDir).catch(() => {});
	});

	test(`a credential decrypts in the session that saved it`, async () => {
		test.setTimeout(60_000);

		const electronApp = await launchEyas([], sharedUserDataDir, originalProjectDir);
		await getUiView(electronApp);

		await saveCredentialAndConfirm(electronApp);

		const creds = await readCredentials(electronApp);
		expect(creds).toEqual([{ username: USERNAME, passwordPlain: PASSWORD }]);

		await exitEyas(electronApp);
	});

	test(`a credential decrypts after relaunch with the same testId`, async () => {
		test.setTimeout(60_000);

		// The prior test already wrote credentials.json under this projectId, but do
		// not depend on test ordering — write it again from a fresh launch.
		let electronApp = await launchEyas([], sharedUserDataDir, originalProjectDir);
		await getUiView(electronApp);
		await saveCredentialAndConfirm(electronApp);
		await exitEyas(electronApp);

		// Same projectId AND same testId means `sessionData` resolves to the same
		// directory, so Chromium's `Local State` — and the safeStorage key inside it
		// — is the same one that performed the encryption.
		electronApp = await launchEyas([], sharedUserDataDir, originalProjectDir);
		await getUiView(electronApp);

		const creds = await readCredentials(electronApp);
		expect(creds, `credentials must survive a relaunch of the same build`)
			.toEqual([{ username: USERNAME, passwordPlain: PASSWORD }]);

		await exitEyas(electronApp);
	});

	test(`a credential decrypts after relaunch with a new testId`, async () => {
		test.setTimeout(60_000);

		let electronApp = await launchEyas([], sharedUserDataDir, originalProjectDir);
		await getUiView(electronApp);
		await saveCredentialAndConfirm(electronApp);
		await exitEyas(electronApp);

		// Same projectId, different testId — i.e. the same project rebuilt. Credentials
		// are scoped to projectId, so they MUST still decrypt. On Windows they do not,
		// because the rotated `sessionData` path handed safeStorage a brand new key.
		electronApp = await launchEyas([], sharedUserDataDir, rotatedTestIdProjectDir);
		await getUiView(electronApp);

		const creds = await readCredentials(electronApp);
		expect(creds, `credentials are scoped to projectId, so a new testId must not orphan them`)
			.toEqual([{ username: USERNAME, passwordPlain: PASSWORD }]);

		await exitEyas(electronApp);
	});
});
