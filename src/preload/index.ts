import { contextBridge } from 'electron';
import { exposeElectronAPI } from '@electron-toolkit/preload';

if (process.contextIsolated) {
  try {
    exposeElectronAPI();
    contextBridge.exposeInMainWorld('electron', {
       // add custom IPCs here
    });
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in d.ts)
  window.electron = exposeElectronAPI();
}
