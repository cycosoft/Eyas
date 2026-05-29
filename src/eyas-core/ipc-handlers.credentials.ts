import { ipcMain } from 'electron';
import type { CoreContext } from '@registry/eyas-core.js';
import type { CredentialPayload, GetCredentialsPayload } from '@registry/ipc.js';
import type { CredentialMetadata } from '@registry/core.js';
import type { ChannelName } from '@registry/primitives.js';
import credentialStore from './credential-store.js';

// Initializes credential-related IPC listeners.
export function initCredentialIpcListeners(ctx: CoreContext): void {
	setupSaveAttemptListener(ctx);
	setupSaveConfirmListener(ctx);
	setupGetCredentialsHandler(ctx);
	setupGetAllCredentialsHandler(ctx);
	setupDeleteCredentialListener(ctx);
}

function setupSaveAttemptListener(ctx: CoreContext): void {
	ipcMain.on(`save-login-attempt`, async (_event, payload: CredentialPayload) => {
		const activeProjectId = ctx.$config?.meta?.projectId || ``;
		if (!activeProjectId) { return; }

		const { origin, username, passwordPlain } = payload;

		try {
			// Query existing credentials
			const existing = await credentialStore.getCredentials(activeProjectId, origin);
			const isDuplicate = existing.some(
				c => c.username === username && c.passwordPlain === passwordPlain
			);

			if (!isDuplicate) {
				// Prompt the UI
				ctx.uiEvent(`show-save-credential-modal` as ChannelName, {
					origin,
					username,
					passwordPlain
				});
			}
		} catch (err) {
			console.error(`Error handling save-login-attempt IPC:`, err);
		}
	});
}

function setupSaveConfirmListener(ctx: CoreContext): void {
	ipcMain.on(`save-credential-confirm`, async (_event, payload: CredentialPayload) => {
		const activeProjectId = ctx.$config?.meta?.projectId || ``;
		if (!activeProjectId) { return; }

		const { origin, username, passwordPlain } = payload;

		try {
			await credentialStore.saveCredential(activeProjectId, origin, username, passwordPlain);
		} catch (err) {
			console.error(`Error saving credential:`, err);
		}
	});
}

function setupGetCredentialsHandler(ctx: CoreContext): void {
	ipcMain.handle(`get-credentials`, async (_event, payload: GetCredentialsPayload) => {
		const activeProjectId = ctx.$config?.meta?.projectId || ``;
		if (!activeProjectId) { return []; }

		try {
			return await credentialStore.getCredentials(activeProjectId, payload.origin);
		} catch (err) {
			console.error(`Error retrieving credentials:`, err);
			return [];
		}
	});
}

function setupGetAllCredentialsHandler(ctx: CoreContext): void {
	ipcMain.handle(`get-all-credentials`, async () => {
		const activeProjectId = ctx.$config?.meta?.projectId || ``;
		if (!activeProjectId) { return []; }

		try {
			return await credentialStore.getAllCredentials(activeProjectId);
		} catch (err) {
			console.error(`Error retrieving all project credentials:`, err);
			return [];
		}
	});
}

function setupDeleteCredentialListener(ctx: CoreContext): void {
	ipcMain.on(`delete-credential`, async (_event, payload: CredentialMetadata) => {
		const activeProjectId = ctx.$config?.meta?.projectId || ``;
		if (!activeProjectId) { return; }

		try {
			await credentialStore.deleteCredential(activeProjectId, payload.origin, payload.username);
		} catch (err) {
			console.error(`Error deleting credential:`, err);
		}
	});
}
