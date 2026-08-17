# TODO

-

# Future

- the recording list needs to be scrolled back to the position it was at when you left that view
- give each step a number in the recording steps view
- recording state redesign Phase 4 — stats UI: surface playback history stats (pass/fail rate, run duration trends, per-step timing derived from run_steps.happenedAt deltas) in the interface, now that Phase 3 data exists.
- window.eyas.receive() (src/scripts/event-bridge.ts) does a bare ipcRenderer.on with no dedupe/cleanup; components that call it in onMounted with no matching onUnmounted removeListener stack duplicate listeners across Vite HMR reloads in dev. Consider adding cleanup, e.g. onUnmounted(() => window.eyas?.removeListener(...)), across the ~15 components that use receive()
