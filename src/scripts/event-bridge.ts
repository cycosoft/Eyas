import { contextBridge, ipcRenderer } from "electron";
import type { ChannelName } from "@registry/primitives.js";
import { VALID_SEND_CHANNELS, VALID_RECEIVE_CHANNELS } from "@registry/ipc.js";

// via ( https://stackoverflow.com/a/59814127 )
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(`eyas`, {
	send: (channel: ChannelName, data?: unknown): void => {
		if (VALID_SEND_CHANNELS.includes(channel as never)) {
			ipcRenderer.send(channel, data);
		}
	},

	receive: (channel: ChannelName, func: (...args: unknown[]) => void): void => {
		if (VALID_RECEIVE_CHANNELS.includes(channel as never)) {
			// Deliberately strip event as it includes `sender`
			ipcRenderer.on(channel, (_event: unknown, ...args: unknown[]) => { func(...args); });
		}
	}
});
