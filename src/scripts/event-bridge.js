// imports
const { contextBridge, ipcRenderer } = require(`electron`);

// via ( https://stackoverflow.com/a/59814127 )
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(`eyas`, {
	send: (channel, data) => {
		// whitelist channels
		const validChannels = [
			`app-exit`,
			`hide-ui`,
			`environment-selected`,
			`launch-link`,
			`network-status`,
			`test-server-setup-continue`,
			`test-server-setup-step`,
			`test-server-resume-confirm`,
			`save-setting`,
			`get-settings`
		];

		if (validChannels.includes(channel)) {
			ipcRenderer.send(channel, data);
		}
	},

	receive: (channel, func) => {
		const validChannels = [
			`modal-exit-visible`,
			`show-environment-modal`,
			`show-variables-modal`,
			`show-version-mismatch-modal`,
			`show-test-server-setup-modal`,
			`show-test-server-resume-modal`,
			`close-modals`,
			`show-settings-modal`,
			`setting-saved`,
			`settings-loaded`
		];
		if (validChannels.includes(channel)) {
			// Deliberately strip event as it includes `sender`
			ipcRenderer.on(channel, (event, ...args) => func(...args));
		}
	}
});
