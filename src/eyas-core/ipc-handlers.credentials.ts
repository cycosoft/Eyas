import { ipcMain } from 'electron';
import type { CoreContext } from '@registry/eyas-core.js';
import type { CredentialPayload } from '@registry/ipc.js';
import type { ChannelName } from '@registry/primitives.js';
import credentialStore from './credential-store.js';

// Initializes credential-related IPC listeners.
export function initCredentialIpcListeners(ctx: CoreContext): void {
	// Receive login attempts from preload
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

	// Save confirmed credential
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
