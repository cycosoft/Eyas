import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { ChannelName } from '@registry/primitives.js';

try {
	contextBridge.exposeInMainWorld(`electron`, {
		ipcRenderer: {
			send: (channel: ChannelName, data?: unknown): void => { ipcRenderer.send(channel, data); },
			on: (channel: ChannelName, func: (...args: unknown[]) => void): (() => void) => {
				const subscription = (_event: IpcRendererEvent, ...args: unknown[]): void => func(...args);
				ipcRenderer.on(channel, subscription);
				return (): void => { ipcRenderer.removeListener(channel, subscription); };
			}
		}
	});
} catch (error) {
	console.error(error);
}
