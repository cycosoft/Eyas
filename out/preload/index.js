"use strict";
const electron = require("electron");
try {
  electron.contextBridge.exposeInMainWorld("electron", {
    ipcRenderer: {
      send: (channel, data) => electron.ipcRenderer.send(channel, data),
      on: (channel, func) => {
        const subscription = (_event, ...args) => func(...args);
        electron.ipcRenderer.on(channel, subscription);
        return () => electron.ipcRenderer.removeListener(channel, subscription);
      }
    }
  });
} catch (error) {
  console.error(error);
}
