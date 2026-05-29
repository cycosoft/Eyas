import { app, safeStorage } from 'electron';
import _path from 'path';
import fs from 'fs-extra';
const { readJson, outputJson } = fs;
import type { CredentialStoreService, CredentialStoreData, DecryptedCredential, CredentialMetadata } from '@registry/core.js';
import type { FilePath, ProjectId, DomainUrl, Username, PasswordPlain } from '@registry/primitives.js';

let _data: CredentialStoreData | null = null;
let _storagePath: FilePath | null = null;

function _setStoragePath(p: FilePath): void {
	_storagePath = p;
	_data = null;
}

async function load(): Promise<void> {
	if (!_storagePath) {
		_storagePath = _path.join(app.getPath(`userData`), `credentials.json`);
	}

	try {
		const raw = await readJson(_storagePath);
		_data = raw || {};
	} catch {
		_data = {};
	}
}

async function save(): Promise<void> {
	if (!_storagePath) {
		_storagePath = _path.join(app.getPath(`userData`), `credentials.json`);
	}
	if (_storagePath) {
		await outputJson(_storagePath, _data, { spaces: 2 });
	}
}

async function saveCredential(projectId: ProjectId, origin: DomainUrl, username: Username, passwordPlain: PasswordPlain): Promise<void> {
	if (!_data) {
		await load();
	}
	if (!_data) { return; }

	if (!safeStorage.isEncryptionAvailable()) {
		throw new Error(`Encryption is not available on this platform.`);
	}

	const encryptedBuffer = await safeStorage.encryptStringAsync(passwordPlain);
	const passwordHex = encryptedBuffer.toString(`hex`);

	if (!_data[projectId]) {
		_data[projectId] = {};
	}
	if (!_data[projectId][origin]) {
		_data[projectId][origin] = [];
	}

	const existingIndex = _data[projectId][origin].findIndex(c => c.username === username);
	if (existingIndex !== -1) {
		_data[projectId][origin][existingIndex].passwordHex = passwordHex;
	} else {
		_data[projectId][origin].push({ username, passwordHex });
	}

	await save();
}

async function getCredentials(projectId: ProjectId, origin: DomainUrl): Promise<DecryptedCredential[]> {
	if (!_data) {
		await load();
	}
	if (!_data || !_data[projectId] || !_data[projectId][origin]) {
		return [];
	}

	if (!safeStorage.isEncryptionAvailable()) {
		throw new Error(`Encryption is not available on this platform.`);
	}

	const result: DecryptedCredential[] = [];
	for (const cred of _data[projectId][origin]) {
		try {
			const buffer = Buffer.from(cred.passwordHex, `hex`);
			const decryptedObj = await safeStorage.decryptStringAsync(buffer);
			// Modern electron returns { result: string, shouldReEncrypt: boolean }
			const passwordPlain = typeof decryptedObj === `string` ? decryptedObj : decryptedObj.result;
			result.push({ username: cred.username, passwordPlain });
		} catch (err) {
			console.error(`Failed to decrypt credential for ${cred.username} at ${origin} under project ${projectId}:`, err);
		}
	}

	return result;
}

async function getAllCredentials(projectId: ProjectId): Promise<CredentialMetadata[]> {
	if (!_data) {
		await load();
	}
	if (!_data || !_data[projectId]) {
		return [];
	}

	const result: CredentialMetadata[] = [];
	for (const [origin, list] of Object.entries(_data[projectId])) {
		for (const cred of list) {
			result.push({ origin: origin as DomainUrl, username: cred.username });
		}
	}
	return result;
}

async function deleteCredential(projectId: ProjectId, origin: DomainUrl, username: Username): Promise<void> {
	if (!_data) {
		await load();
	}
	if (!_data || !_data[projectId] || !_data[projectId][origin]) { return; }

	_data[projectId][origin] = _data[projectId][origin].filter(c => c.username !== username);
	if (_data[projectId][origin].length === 0) {
		delete _data[projectId][origin];
	}
	if (Object.keys(_data[projectId]).length === 0) {
		delete _data[projectId];
	}

	await save();
}

const credentialStore: CredentialStoreService = {
	saveCredential,
	getCredentials,
	getAllCredentials,
	deleteCredential,
	load,
	save,
	_setStoragePath
};

export default credentialStore;
