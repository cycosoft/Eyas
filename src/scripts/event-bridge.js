// imports
const { contextBridge, ipcRenderer } = require(`electron`);

// via ( https://stackoverflow.com/a/59814127 )
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(`eventBridge`, {
	send: (channel, data) => {
		// whitelist channels
		const validChannels = [`app-exit`, `open-in-browser`, `hide-ui`, `select-environment`];
		if (validChannels.includes(channel)) {
			ipcRenderer.send(channel, data);
		}
	},

	receive: (channel, func) => {
		const validChannels = [`modal-exit-visible`, `choose-environment`];
		if (validChannels.includes(channel)) {
			// Deliberately strip event as it includes `sender`
			ipcRenderer.on(channel, (event, ...args) => func(...args));
		}
	}
});