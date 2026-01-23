# Electron Update Notes v32.1.2 -> v40.x

## Breaking Changes
- These noted items may affect functionality in the app, and we need to confirm.


- Custom protocol URLs that use Windows file paths will no longer work correctly with the deprecated protocol.registerFileProtocol and the baseURLForDataURL property on BrowserWindow.loadURL, WebContents.loadURL, and <webview>.loadURL. #43977

- Added DownloadItem.getCurrentBytesPerSecond(), DownloadItem.getPercentComplete(), DownloadItem.getEndTime(). #42805 (Also in 30, 31, 32)

- Fixed an issue where the exit event could be emitted twice from the utilityProcess. #44267

-