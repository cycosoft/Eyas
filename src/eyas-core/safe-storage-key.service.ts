import { app, safeStorage } from 'electron';
import _path from 'node:path';
import fsExtra from 'fs-extra';
import fs from 'node:fs/promises';
import { isWindows } from '@scripts/platform-utils.js';
import type { FilePath, GenericRecord, WasSeeded, Count, DurationMS } from '@registry/primitives.js';

// ─────────────────────────────────────────────────────────────────────────────
// safeStorage encrypts with a random key that Chromium wraps with the OS (DPAPI on
// Windows) and stores in `os_crypt` inside `Local State`, which lives in the
// *sessionData* directory. EYAS-334 relocates sessionData per projectId/testId, so
// on Windows every build got a brand new key while `credentials.json` stayed at the
// (stable, app-wide) userData root — making yesterday's credentials undecryptable.
//
// The fix keeps one canonical key at `<userData>/Local State` and copies its
// `os_crypt` block into each session directory before Chromium reads it. Because
// sessionData no longer points at the userData root, Chromium never touches that
// canonical file itself — it is effectively our own key store, and for anyone who
// ran Eyas before EYAS-334 it already holds the original key, so seeding doubles as
// the migration.
//
// macOS keys come from the app-wide Keychain and were never affected; Linux backends
// vary. Windows only.
// ─────────────────────────────────────────────────────────────────────────────

const LOCAL_STATE_FILE = `Local State`;
const OS_CRYPT_KEY = `os_crypt`;

/** How long to keep waiting for Chromium to flush a freshly generated key to disk. */
const CAPTURE_ATTEMPTS = 30 as Count;
const CAPTURE_DELAY_MS = 500 as DurationMS;

let _canonicalPathOverride: FilePath | null = null;

/** Test-only escape hatch — redirect canonical key I/O to a temp directory. */
function _setCanonicalPathOverride(pathOverride: FilePath | null): void {
	_canonicalPathOverride = pathOverride;
}

function _canonicalPath(): FilePath {
	return _canonicalPathOverride ?? _path.join(app.getPath(`userData`), LOCAL_STATE_FILE) as FilePath;
}

function _localStatePath(sessionDataDir: FilePath): FilePath {
	return _path.join(sessionDataDir, LOCAL_STATE_FILE) as FilePath;
}

async function _readState(statePath: FilePath): Promise<GenericRecord | null> {
	try {
		return await fsExtra.readJson(statePath);
	} catch {
		return null; // missing or malformed — treat as absent
	}
}

/** Returns the wrapped-key block from a `Local State` document, or null if absent. */
function _osCrypt(state: GenericRecord | null): GenericRecord | null {
	const block = state?.[OS_CRYPT_KEY] as GenericRecord | undefined;
	return block && typeof block === `object` ? block : null;
}

/**
 * Writes via a temp file then renames, so a second Eyas process reading the same
 * file concurrently never observes a torn write (matching credential-store).
 */
async function _writeStateAtomically(statePath: FilePath, state: GenericRecord): Promise<void> {
	const tmpPath = `${statePath}.${process.pid}.tmp`;
	await fsExtra.outputJson(tmpPath, state, { spaces: 2 });
	await fsExtra.move(tmpPath, statePath, { overwrite: true });
}

/**
 * Copies the canonical `os_crypt` block into a session's `Local State`, merging
 * rather than replacing so any other profile state Chromium wrote there survives.
 *
 * MUST run before `app.setPath('sessionData', …)` hands the directory to Chromium —
 * once Chromium has initialized OSCrypt for a profile, the key it loaded is fixed
 * for the life of the process.
 *
 * @returns whether a key was written
 */
async function seedSessionKey(sessionDataDir: FilePath): Promise<WasSeeded> {
	if (!isWindows) { return false; }

	const canonicalOsCrypt = _osCrypt(await _readState(_canonicalPath()));
	if (!canonicalOsCrypt) { return false; } // first run — nothing to seed yet

	const targetPath = _localStatePath(sessionDataDir);
	const existing = await _readState(targetPath);

	// Already carrying the canonical key (e.g. relaunch of the same testId)
	if (JSON.stringify(_osCrypt(existing)) === JSON.stringify(canonicalOsCrypt)) { return false; }

	await _writeStateAtomically(targetPath, { ...(existing || {}), [OS_CRYPT_KEY]: canonicalOsCrypt });
	return true;
}

/**
 * Forces OSCrypt to initialize so Chromium generates and persists a key. Without
 * this, a first run that never touches safeStorage may quit before any key exists
 * to capture.
 *
 * Deliberately the *async* availability check rather than a throwaway
 * `encryptString()`: Electron initializes the sync and async encryptors separately,
 * and the credential store uses the async pair. They resolve to the same key on
 * Windows today, but materializing the encryptor we actually depend on keeps that
 * from mattering.
 */
async function _forceKeyMaterialization(): Promise<void> {
	try {
		await safeStorage.isAsyncEncryptionAvailable();
	} catch {
		// Encryption unavailable on this machine — capture will find nothing and no-op
	}
}

async function _claimCanonical(osCrypt: GenericRecord): Promise<WasSeeded> {
	const canonicalPath = _canonicalPath();
	const payload = JSON.stringify({ [OS_CRYPT_KEY]: osCrypt }, null, 2);

	// Exclusive create: two fresh instances racing to establish the first canonical
	// key cannot both win, so they cannot end up encrypting under different keys.
	try {
		await fsExtra.ensureDir(_path.dirname(canonicalPath));
		const handle = await fs.open(canonicalPath, `wx`);
		await handle.writeFile(payload);
		await handle.close();
		return true;
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code !== `EEXIST`) { throw err; }
	}

	// The file appeared (or already existed) — only fill in a missing key block.
	const existing = await _readState(canonicalPath);
	if (_osCrypt(existing)) { return false; }

	await _writeStateAtomically(canonicalPath, { ...(existing || {}), [OS_CRYPT_KEY]: osCrypt });
	return true;
}

/**
 * Establishes the canonical key from this session's generated one. Only ever acts
 * on a first run (no canonical key yet); afterwards the canonical file is the source
 * of truth and this is a no-op.
 *
 * Chromium writes `Local State` lazily, so this polls rather than reading once.
 * Safe to call more than once and safe to leave un-awaited.
 *
 * @returns whether a canonical key was established
 */
async function captureCanonicalKey(sessionDataDir: FilePath, attempts: Count = CAPTURE_ATTEMPTS): Promise<WasSeeded> {
	if (!isWindows) { return false; }
	if (_osCrypt(await _readState(_canonicalPath()))) { return false; }

	await _forceKeyMaterialization();

	const sessionStatePath = _localStatePath(sessionDataDir);
	for (let attempt = 0; attempt < attempts; attempt++) {
		const sessionOsCrypt = _osCrypt(await _readState(sessionStatePath));
		if (sessionOsCrypt) { return _claimCanonical(sessionOsCrypt); }
		await new Promise(resolve => setTimeout(resolve, CAPTURE_DELAY_MS));
	}

	console.error(`[SAFE-STORAGE-KEY] Chromium never persisted an encryption key; credentials saved this session may not survive a rebuild.`);
	return false;
}

export const safeStorageKeyService = {
	seedSessionKey,
	captureCanonicalKey,
	_setCanonicalPathOverride
};
