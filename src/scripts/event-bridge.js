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
			`expose-setup-continue`,
			`expose-setup-step`
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
			`show-expose-setup-modal`,
			`close-modals`
		];
		if (validChannels.includes(channel)) {
			// Deliberately strip event as it includes `sender`
			ipcRenderer.on(channel, (event, ...args) => func(...args));
		}
	}
});