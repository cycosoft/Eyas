import { contextBridge, ipcRenderer } from 'electron';

try {
	contextBridge.exposeInMainWorld(`electron`, {
		ipcRenderer: {
			send: (channel: string, data?: any) => ipcRenderer.send(channel, data),
			on: (channel: string, func: (...args: any[]) => void) => {
				const subscription = (_event: any, ...args: any[]) => func(...args);
				ipcRenderer.on(channel, subscription);
				return () => ipcRenderer.removeListener(channel, subscription);
			}
		}
	});
} catch (error) {
	console.error(error);
}
