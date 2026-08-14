# TODO

- update changelog
- what do the status badges mean next to the tests in the panel? (change this to represent the last test status - red = failed, green = passed, gray = not run)

# Future

- window.eyas.receive() (src/scripts/event-bridge.ts) does a bare ipcRenderer.on with no dedupe/cleanup; components that call it in onMounted with no matching onUnmounted removeListener stack duplicate listeners across Vite HMR reloads in dev (harmless in production since components like AppHeader mount once). Consider adding cleanup, e.g. onUnmounted(() => window.eyas?.removeListener(...)), across the ~15 components that use receive()
