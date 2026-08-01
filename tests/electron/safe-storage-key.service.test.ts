import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { remove, ensureDir, outputJson, readJson, pathExists } from 'fs-extra';
import type { FilePath } from '@registry/primitives.js';

// The service is Windows-only; default the platform flag to true so the behavioral
// tests exercise the real path, and flip it per-test for the no-op assertions.
const platform = vi.hoisted(() => ({ isWindows: true, isMac: false }));
vi.mock(`@scripts/platform-utils.js`, () => platform);

const { isAsyncEncryptionAvailable } = vi.hoisted(() => ({
	isAsyncEncryptionAvailable: vi.fn().mockResolvedValue(true)
}));
vi.mock(`electron`, () => ({
	app: { getPath: vi.fn().mockReturnValue(`/mock/user/data`) },
	safeStorage: { isAsyncEncryptionAvailable }
}));

import { safeStorageKeyService } from '@core/safe-storage-key.service.js';

const OS_CRYPT = { encrypted_key: `RFBBUEktY2Fub25pY2Fs`, audit_enabled: true };
const OTHER_OS_CRYPT = { encrypted_key: `RFBBUEktc2Vzc2lvbg==`, audit_enabled: true };

let root: FilePath;
let canonicalPath: FilePath;
let sessionDir: FilePath;
let sessionStatePath: FilePath;

beforeEach(async () => {
	platform.isWindows = true;
	isAsyncEncryptionAvailable.mockClear();

	root = join(tmpdir(), `eyas-key-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	canonicalPath = join(root, `Local State`);
	sessionDir = join(root, `project-a`, `build-1`);
	sessionStatePath = join(sessionDir, `Local State`);

	await ensureDir(root);
	safeStorageKeyService._setCanonicalPathOverride(canonicalPath);
});

afterEach(async () => {
	safeStorageKeyService._setCanonicalPathOverride(null);
	await remove(root).catch(() => { });
});

describe(`seedSessionKey`, () => {
	test(`copies the canonical key into a session directory that has no Local State`, async () => {
		await outputJson(canonicalPath, { os_crypt: OS_CRYPT });

		expect(await safeStorageKeyService.seedSessionKey(sessionDir)).toBe(true);
		expect((await readJson(sessionStatePath)).os_crypt).toEqual(OS_CRYPT);
	});

	test(`replaces a session key that differs from the canonical one`, async () => {
		await outputJson(canonicalPath, { os_crypt: OS_CRYPT });
		await outputJson(sessionStatePath, { os_crypt: OTHER_OS_CRYPT });

		expect(await safeStorageKeyService.seedSessionKey(sessionDir)).toBe(true);
		expect((await readJson(sessionStatePath)).os_crypt).toEqual(OS_CRYPT);
	});

	test(`preserves unrelated profile state already in the session's Local State`, async () => {
		await outputJson(canonicalPath, { os_crypt: OS_CRYPT });
		await outputJson(sessionStatePath, { os_crypt: OTHER_OS_CRYPT, profile: { info_cache: { a: 1 } } });

		await safeStorageKeyService.seedSessionKey(sessionDir);

		const state = await readJson(sessionStatePath);
		expect(state.os_crypt).toEqual(OS_CRYPT);
		expect(state.profile).toEqual({ info_cache: { a: 1 } });
	});

	test(`is a no-op when the session already carries the canonical key`, async () => {
		await outputJson(canonicalPath, { os_crypt: OS_CRYPT });
		await outputJson(sessionStatePath, { os_crypt: OS_CRYPT });

		expect(await safeStorageKeyService.seedSessionKey(sessionDir)).toBe(false);
	});

	test(`is a no-op on a first run with no canonical key yet`, async () => {
		expect(await safeStorageKeyService.seedSessionKey(sessionDir)).toBe(false);
		expect(await pathExists(sessionStatePath)).toBe(false);
	});

	test(`is a no-op when the canonical file exists but has no os_crypt block`, async () => {
		await outputJson(canonicalPath, { profile: {} });

		expect(await safeStorageKeyService.seedSessionKey(sessionDir)).toBe(false);
		expect(await pathExists(sessionStatePath)).toBe(false);
	});

	test(`does nothing off Windows, where the key comes from the OS keychain`, async () => {
		platform.isWindows = false;
		await outputJson(canonicalPath, { os_crypt: OS_CRYPT });

		expect(await safeStorageKeyService.seedSessionKey(sessionDir)).toBe(false);
		expect(await pathExists(sessionStatePath)).toBe(false);
	});
});

describe(`captureCanonicalKey`, () => {
	test(`adopts the session's generated key when no canonical key exists`, async () => {
		await outputJson(sessionStatePath, { os_crypt: OTHER_OS_CRYPT });

		expect(await safeStorageKeyService.captureCanonicalKey(sessionDir, 1)).toBe(true);
		expect((await readJson(canonicalPath)).os_crypt).toEqual(OTHER_OS_CRYPT);
	});

	test(`materializes the async encryptor — the one the credential store uses`, async () => {
		await outputJson(sessionStatePath, { os_crypt: OTHER_OS_CRYPT });

		await safeStorageKeyService.captureCanonicalKey(sessionDir, 1);

		expect(isAsyncEncryptionAvailable).toHaveBeenCalled();
	});

	test(`leaves an established canonical key untouched`, async () => {
		await outputJson(canonicalPath, { os_crypt: OS_CRYPT });
		await outputJson(sessionStatePath, { os_crypt: OTHER_OS_CRYPT });

		expect(await safeStorageKeyService.captureCanonicalKey(sessionDir, 1)).toBe(false);
		expect((await readJson(canonicalPath)).os_crypt).toEqual(OS_CRYPT);
	});

	test(`fills in a canonical file that exists without an os_crypt block`, async () => {
		await outputJson(canonicalPath, { profile: { info_cache: {} } });
		await outputJson(sessionStatePath, { os_crypt: OTHER_OS_CRYPT });

		expect(await safeStorageKeyService.captureCanonicalKey(sessionDir, 1)).toBe(true);

		const state = await readJson(canonicalPath);
		expect(state.os_crypt).toEqual(OTHER_OS_CRYPT);
		expect(state.profile).toEqual({ info_cache: {} });
	});

	test(`gives up without throwing when Chromium never writes a key`, async () => {
		expect(await safeStorageKeyService.captureCanonicalKey(sessionDir, 1)).toBe(false);
		expect(await pathExists(canonicalPath)).toBe(false);
	});

	test(`only one of two racing instances establishes the canonical key`, async () => {
		await outputJson(sessionStatePath, { os_crypt: OTHER_OS_CRYPT });

		const results = await Promise.all([
			safeStorageKeyService.captureCanonicalKey(sessionDir, 1),
			safeStorageKeyService.captureCanonicalKey(sessionDir, 1)
		]);

		expect(results.filter(Boolean)).toHaveLength(1);
		expect((await readJson(canonicalPath)).os_crypt).toEqual(OTHER_OS_CRYPT);
	});

	test(`does nothing off Windows`, async () => {
		platform.isWindows = false;
		await outputJson(sessionStatePath, { os_crypt: OTHER_OS_CRYPT });

		expect(await safeStorageKeyService.captureCanonicalKey(sessionDir, 1)).toBe(false);
		expect(await pathExists(canonicalPath)).toBe(false);
	});
});
