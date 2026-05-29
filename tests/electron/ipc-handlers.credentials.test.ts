import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ipcMain, type IpcMainEvent } from 'electron';
import { initCredentialIpcListeners } from '@core/ipc-handlers.credentials.js';
import credentialStore from '@core/credential-store.js';
import type { CoreContext } from '@registry/eyas-core.js';
import type { Username, PasswordPlain, DomainUrl } from '@registry/primitives.js';

// Mock electron
vi.mock(`electron`, () => ({
	ipcMain: {
		on: vi.fn(),
		handle: vi.fn()
	}
}));

// Mock credential store
vi.mock(`../../src/eyas-core/credential-store.js`, () => ({
	default: {
		saveCredential: vi.fn(),
		getCredentials: vi.fn(),
		getAllCredentials: vi.fn(),
		deleteCredential: vi.fn(),
		load: vi.fn(),
		save: vi.fn()
	}
}));

describe(`Save Login Attempt IPC`, () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test(`save-login-attempt IPC handler should check if credential already exists and trigger UI confirmation if new`, async () => {
		const ctx = {
			$config: { meta: { projectId: `test-proj` } },
			uiEvent: vi.fn()
		} as unknown as CoreContext;

		let handler: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

		vi.spyOn(ipcMain, `on`).mockImplementation((channel, cb) => {
			if (channel === `save-login-attempt`) {
				handler = cb;
			}
			return ipcMain;
		});

		initCredentialIpcListeners(ctx);

		expect(handler).toBeTypeOf(`function`);
		if (!handler) { return; }

		// Mock the credential store
		type MockMethod = { mockResolvedValue: (value: unknown) => void };
		(credentialStore.getCredentials as unknown as MockMethod).mockResolvedValue([]);

		// Trigger the handler with a new credential
		await handler({} as IpcMainEvent, {
			origin: `https://example.com` as DomainUrl,
			username: `user1` as Username,
			passwordPlain: `newPass` as PasswordPlain
		});

		// It should check the store
		expect(credentialStore.getCredentials).toHaveBeenCalledWith(`test-proj`, `https://example.com`);
		// Since it is a new credential, it should prompt the UI via uiEvent
		expect(ctx.uiEvent).toHaveBeenCalledWith(`show-save-credential-modal`, {
			origin: `https://example.com`,
			username: `user1`,
			passwordPlain: `newPass`
		});
	});

	test(`save-login-attempt IPC handler should NOT trigger UI confirmation if credential already exists with same username and password`, async () => {
		const ctx = {
			$config: { meta: { projectId: `test-proj` } },
			uiEvent: vi.fn()
		} as unknown as CoreContext;

		let handler: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

		vi.spyOn(ipcMain, `on`).mockImplementation((channel, cb) => {
			if (channel === `save-login-attempt`) {
				handler = cb;
			}
			return ipcMain;
		});

		initCredentialIpcListeners(ctx);
		if (!handler) { return; }

		// Mock credential store to return existing match
		type MockMethod = { mockResolvedValue: (value: unknown) => void };
		(credentialStore.getCredentials as unknown as MockMethod).mockResolvedValue([
			{ username: `user1` as Username, passwordPlain: `existingPass` as PasswordPlain }
		]);

		// Trigger with the same username and password
		await handler({} as IpcMainEvent, {
			origin: `https://example.com` as DomainUrl,
			username: `user1` as Username,
			passwordPlain: `existingPass` as PasswordPlain
		});

		expect(ctx.uiEvent).not.toHaveBeenCalled();
	});

	test(`get-credentials IPC handler should return matching credentials for active project`, async () => {
		const ctx = {
			$config: { meta: { projectId: `test-proj` } }
		} as unknown as CoreContext;

		let handler: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
		vi.spyOn(ipcMain, `handle`).mockImplementation((channel, cb) => {
			if (channel === `get-credentials`) {
				handler = cb;
			}
			return ipcMain;
		});

		initCredentialIpcListeners(ctx);

		expect(handler).toBeTypeOf(`function`);
		if (!handler) { return; }

		// Mock the credential store
		type MockMethod = { mockResolvedValue: (value: unknown) => void };
		(credentialStore.getCredentials as unknown as MockMethod).mockResolvedValue([
			{ username: `user1`, passwordPlain: `pass1` }
		]);

		const result = await handler({} as any, { origin: `https://example.com` as DomainUrl }); // eslint-disable-line @typescript-eslint/no-explicit-any

		expect(credentialStore.getCredentials).toHaveBeenCalledWith(`test-proj`, `https://example.com`);
		expect(result).toEqual([{ username: `user1`, passwordPlain: `pass1` }]);
	});

	test(`get-all-credentials IPC handler should return all matching credentials for active project`, async () => {
		const ctx = {
			$config: { meta: { projectId: `test-proj` } }
		} as unknown as CoreContext;

		let handler: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
		vi.spyOn(ipcMain, `handle`).mockImplementation((channel, cb) => {
			if (channel === `get-all-credentials`) {
				handler = cb;
			}
			return ipcMain;
		});

		initCredentialIpcListeners(ctx);

		expect(handler).toBeTypeOf(`function`);
		if (!handler) { return; }

		// Mock the credential store
		type MockMethod = { mockResolvedValue: (value: unknown) => void };
		(credentialStore.getAllCredentials as unknown as MockMethod).mockResolvedValue([
			{ origin: `https://example.com`, username: `user1` }
		]);

		const result = await handler({} as any); // eslint-disable-line @typescript-eslint/no-explicit-any

		expect(credentialStore.getAllCredentials).toHaveBeenCalledWith(`test-proj`);
		expect(result).toEqual([{ origin: `https://example.com`, username: `user1` }]);
	});

	test(`delete-credential IPC handler should call deleteCredential`, async () => {
		const ctx = {
			$config: { meta: { projectId: `test-proj` } }
		} as unknown as CoreContext;

		let handler: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
		vi.spyOn(ipcMain, `on`).mockImplementation((channel, cb) => {
			if (channel === `delete-credential`) {
				handler = cb;
			}
			return ipcMain;
		});

		initCredentialIpcListeners(ctx);

		expect(handler).toBeTypeOf(`function`);
		if (!handler) { return; }

		// Mock the credential store
		type MockMethod = { mockResolvedValue: (value: unknown) => void };
		(credentialStore.deleteCredential as unknown as MockMethod).mockResolvedValue(undefined);

		await handler({} as any, { origin: `https://example.com`, username: `user1` }); // eslint-disable-line @typescript-eslint/no-explicit-any

		expect(credentialStore.deleteCredential).toHaveBeenCalledWith(`test-proj`, `https://example.com`, `user1`);
	});
});

