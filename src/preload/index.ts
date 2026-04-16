import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';

try {
	contextBridge.exposeInMainWorld(`electron`, {
		ipcRenderer: {
			send: (channel: string, data?: unknown) => ipcRenderer.send(channel, data),
			on: (channel: string, func: (...args: unknown[]) => void) => {
				const subscription = (_event: IpcRendererEvent, ...args: unknown[]) => func(...args);
				ipcRenderer.on(channel, subscription);
				return () => ipcRenderer.removeListener(channel, subscription);
			}
		}
	});
} catch (error) {
	console.error(error);
}
