import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FileSystemPath, PasswordPlain } from '@registry/primitives.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { remove, readJson } from 'fs-extra';
import crypto from 'node:crypto';

// Mock electron with async safeStorage using simple encryption so we can test the behavior
const ALGORITHM = `aes-256-cbc`;
const KEY = crypto.randomBytes(32);
const IV = crypto.randomBytes(16);

vi.mock(`electron`, () => ({
	app: {
		getPath: vi.fn().mockReturnValue(`/mock/user/data`)
	},
	safeStorage: {
		isEncryptionAvailable: vi.fn().mockReturnValue(true),
		encryptStringAsync: vi.fn(async (plain: PasswordPlain) => {
			const cipher = crypto.createCipheriv(ALGORITHM, KEY, IV);
			let encrypted = cipher.update(plain, `utf8`, `hex`);
			encrypted += cipher.final(`hex`);
			return Buffer.from(encrypted, `hex`);
		}),
		decryptStringAsync: vi.fn(async (encrypted: Buffer) => {
			const decipher = crypto.createDecipheriv(ALGORITHM, KEY, IV);
			let decrypted = decipher.update(encrypted.toString(`hex`), `hex`, `utf8`);
			decrypted += decipher.final(`utf8`);
			return decrypted;
		})
	}
}));

import credentialStore from '@core/credential-store.js';
import { safeStorage } from 'electron';

let tmpFile: FileSystemPath;

beforeEach(() => {
	tmpFile = join(tmpdir(), `eyas-credentials-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
	credentialStore._setStoragePath(tmpFile);
});

afterEach(async () => {
	await remove(tmpFile).catch(() => { });
});

describe(`Credential Store TDD Tests`, () => {
	test(`load() initialises empty structure when file does not exist`, async () => {
		await credentialStore.load();
		expect(await credentialStore.getCredentials(`project-1`, `https://example.com`)).toEqual([]);
	});

	test(`saveCredential() saves and encrypts password per project`, async () => {
		await credentialStore.load();
		await credentialStore.saveCredential(`project-1`, `https://example.com`, `user1`, `password123`);

		// Verify file contents on disk have encrypted password, not plaintext, scoped to project and origin
		const rawContent = await readJson(tmpFile);
		expect(rawContent[`project-1`]).toBeDefined();
		expect(rawContent[`project-1`][`https://example.com`]).toBeDefined();
		expect(rawContent[`project-1`][`https://example.com`][0].username).toBe(`user1`);
		expect(rawContent[`project-1`][`https://example.com`][0].passwordHex).not.toBe(`password123`);

		// Retrieve and check that it automatically decrypts to plaintext
		const credentials = await credentialStore.getCredentials(`project-1`, `https://example.com`);
		expect(credentials).toHaveLength(1);
		expect(credentials[0].username).toBe(`user1`);
		expect(credentials[0].passwordPlain).toBe(`password123`);
	});

	test(`saveCredential() scopes credentials per project independently`, async () => {
		await credentialStore.load();
		await credentialStore.saveCredential(`project-1`, `https://example.com`, `user1`, `password123`);
		await credentialStore.saveCredential(`project-2`, `https://example.com`, `user1`, `password456`);

		const credsProj1 = await credentialStore.getCredentials(`project-1`, `https://example.com`);
		const credsProj2 = await credentialStore.getCredentials(`project-2`, `https://example.com`);

		expect(credsProj1[0].passwordPlain).toBe(`password123`);
		expect(credsProj2[0].passwordPlain).toBe(`password456`);
	});

	test(`saveCredential() updates existing credential if same project, origin, and username`, async () => {
		await credentialStore.load();
		await credentialStore.saveCredential(`project-1`, `https://example.com`, `user1`, `oldPassword`);
		await credentialStore.saveCredential(`project-1`, `https://example.com`, `user1`, `newPassword`);

		const credentials = await credentialStore.getCredentials(`project-1`, `https://example.com`);
		expect(credentials).toHaveLength(1);
		expect(credentials[0].passwordPlain).toBe(`newPassword`);
	});

	test(`deleteCredential() removes specific credential within a project`, async () => {
		await credentialStore.load();
		await credentialStore.saveCredential(`project-1`, `https://example.com`, `user1`, `pass1`);
		await credentialStore.saveCredential(`project-1`, `https://example.com`, `user2`, `pass2`);

		await credentialStore.deleteCredential(`project-1`, `https://example.com`, `user1`);

		const credentials = await credentialStore.getCredentials(`project-1`, `https://example.com`);
		expect(credentials).toHaveLength(1);
		expect(credentials[0].username).toBe(`user2`);
	});

	test(`getAllCredentials() returns all credentials for a project across origins`, async () => {
		await credentialStore.load();
		await credentialStore.saveCredential(`project-1`, `https://example.com`, `user1`, `pass1`);
		await credentialStore.saveCredential(`project-1`, `https://another.com`, `user2`, `pass2`);
		await credentialStore.saveCredential(`project-2`, `https://example.com`, `user3`, `pass3`);

		const allCreds = await credentialStore.getAllCredentials(`project-1`);
		expect(allCreds).toHaveLength(2);
		expect(allCreds).toEqual(expect.arrayContaining([
			{ origin: `https://example.com`, username: `user1` },
			{ origin: `https://another.com`, username: `user2` }
		]));
	});
});

describe(`Key rotation`, () => {
	test(`getCredentials() re-encrypts entries flagged with shouldReEncrypt`, async () => {
		await credentialStore.load();
		await credentialStore.saveCredential(`project-1`, `https://example.com`, `user1`, `pass1`);

		const beforeHex = (await readJson(tmpFile))[`project-1`][`https://example.com`][0].passwordHex;

		// Simulate Chromium signalling that a better key is available: the value still
		// decrypts, but the ciphertext should be rewritten under the current key.
		vi.mocked(safeStorage.decryptStringAsync).mockImplementationOnce(async () => ({
			result: `pass1`,
			shouldReEncrypt: true
		}));
		vi.mocked(safeStorage.encryptStringAsync).mockImplementationOnce(async () => Buffer.from(`rotated-ciphertext`, `utf8`));

		const credentials = await credentialStore.getCredentials(`project-1`, `https://example.com`);

		// The caller still gets usable plaintext...
		expect(credentials).toEqual([{ username: `user1`, passwordPlain: `pass1` }]);

		// ...and the stored ciphertext has been rewritten.
		const afterHex = (await readJson(tmpFile))[`project-1`][`https://example.com`][0].passwordHex;
		expect(afterHex).not.toBe(beforeHex);
		expect(Buffer.from(afterHex, `hex`).toString(`utf8`)).toBe(`rotated-ciphertext`);
	});

	test(`getCredentials() leaves storage untouched when no rotation is signalled`, async () => {
		await credentialStore.load();
		await credentialStore.saveCredential(`project-1`, `https://example.com`, `user1`, `pass1`);

		const beforeHex = (await readJson(tmpFile))[`project-1`][`https://example.com`][0].passwordHex;
		await credentialStore.getCredentials(`project-1`, `https://example.com`);
		const afterHex = (await readJson(tmpFile))[`project-1`][`https://example.com`][0].passwordHex;

		expect(afterHex).toBe(beforeHex);
	});
});
