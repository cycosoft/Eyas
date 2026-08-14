# TODO

- update changelog
- what do the status badges mean next to the tests in the panel?
- fade the panel while recording is active

# Future

- window.eyas.receive() (src/scripts/event-bridge.ts) does a bare ipcRenderer.on with no dedupe/cleanup; components that call it in onMounted with no matching onUnmounted removeListener stack duplicate listeners across Vite HMR reloads in dev (harmless in production since components like AppHeader mount once). Consider adding cleanup, e.g. onUnmounted(() => window.eyas?.removeListener(...)), across the ~15 components that use receive()
