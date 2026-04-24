// imports
import { contextBridge, ipcRenderer } from "electron";
import type { ChannelName } from "@registry/primitives.js";

// via ( https://stackoverflow.com/a/59814127 )
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(`eyas`, {
	send: (channel: ChannelName, data?: unknown): void => {
		// whitelist channels
		const validChannels = [
			`app-exit`,
			`hide-ui`,
			`show-ui`,
			`environment-selected`,
			`launch-link`,
			`network-status`,
			`test-server-setup-continue`,
			`test-server-setup-step`,
			`test-server-resume-confirm`,
			`test-server-stop`,
			`test-server-open-browser`,
			`test-server-extend`,
			`save-setting`,
			`get-settings`,
			`renderer-ready-for-modals`,
			`whats-new-closed`
		];

		if (validChannels.includes(channel)) {
			ipcRenderer.send(channel, data);
		}
	},

	receive: (channel: ChannelName, func: (...args: unknown[]) => void): void => {
		const validChannels = [
			`modal-exit-visible`,
			`show-environment-modal`,
			`show-variables-modal`,
			`show-version-mismatch-modal`,
			`show-test-server-setup-modal`,
			`show-test-server-resume-modal`,
			`show-test-server-active-modal`,
			`close-modals`,
			`show-settings-modal`,
			`setting-saved`,
			`settings-loaded`,
			`show-whats-new`,
			`ui-shown`
		];
		if (validChannels.includes(channel)) {
			// Deliberately strip event as it includes `sender`
			ipcRenderer.on(channel, (_event: unknown, ...args: unknown[]) => { func(...args); });
		}
	}
});
