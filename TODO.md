# TODO

- i should be able to hit escape to close the recording panel
- npm run check
- update changelog
- other recording buttons are disabled while some other acion is happening, consider flexibility in this
- show the button all the time if that recording has an active action
- what context should the recording controls in the header have if you played back a different recording
- when a playback is stopped by the user, it should not count as failed. that play through history item should be deleted.
- when we delete a recording, it also needs to delete all the history associated with that recording.
- the code that pins the active playing recording to the top should also have the same behavior for the bottom
- I'm unable to stop a playback when a new window is being stepped through

# Future

- animate the icon for the recordings that are playing back inside the recordings list
- should be able to pin the recording panel to full opacity (make default behavior)
- should be able to sort tests by name, creation date, last run date
- show last run relative timestamp on recording list
- the recording list needs to be scrolled back to the position it was at when you left that view
- give each step a number in the recording steps view
- recording state redesign Phase 4 — stats UI: surface playback history stats (pass/fail rate, run duration trends, per-step timing derived from run_steps.happenedAt deltas) in the interface, now that Phase 3 data exists.
- window.eyas.receive() (src/scripts/event-bridge.ts) does a bare ipcRenderer.on with no dedupe/cleanup; components that call it in onMounted with no matching onUnmounted removeListener stack duplicate listeners across Vite HMR reloads in dev. Consider adding cleanup, e.g. onUnmounted(() => window.eyas?.removeListener(...)), across the ~15 components that use receive()
