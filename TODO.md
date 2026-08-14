# TODO

- update changelog
- what do the status badges mean next to the tests in the panel? (change this to represent the last test status - red = failed, green = passed, gray = not run)

# Future

- recording state is currently conflated with the saved recording file itself (session-recorder.service.ts scopes active-session.json by projectId+testId, where testId is per-build metadata) — every build swap abandons the previous build's in-progress recording with no way for it to ever transition out of status: recording, which is why the recordings list shows stale red dots. Redesign into three separate layers:
  - saved recordings — steps/selectors/viewport/title, keyed by projectId only (not testId), so any Eyas instance can see and replay them regardless of which build is loaded
  - per-instance "what am I doing right now" state — actively recording (into which draft) vs editing vs idle; ephemeral/in-memory first, persisted only as a pointer (recordingId + mode) for crash-recovery, never the recording data itself
  - playback history — append-only log of runs keyed by (recordingId, runId): duration, per-step timing, pass/fail/paused, to power stats display
  - no cross-instance lock for concurrent edits of the same recording (decided against: reintroduces the same "stuck forever if a holder disappears" failure shape as the current bug). If silent-overwrite protection is wanted later, use optimistic concurrency (version/updatedAt check on save) instead of a lock
  - storage engine for playback history: SQLite, decided. Flat files ruled out (long-term, growing dataset; need queryable aggregates like average step duration / fail rate over time). Renderer IndexedDB ruled out — main process has no natural IndexedDB access without routing through a specific webContents/partition, which recreates the per-instance coupling that caused the current bug. Use an async driver (e.g. node:sqlite or a promise-based wrapper) rather than a sync one like better-sqlite3 — easier to start async than to convert later. SQLite is a portable single file, easy to back up/export, and a natural fit if a web dashboard consumes this data later
- window.eyas.receive() (src/scripts/event-bridge.ts) does a bare ipcRenderer.on with no dedupe/cleanup; components that call it in onMounted with no matching onUnmounted removeListener stack duplicate listeners across Vite HMR reloads in dev (harmless in production since components like AppHeader mount once). Consider adding cleanup, e.g. onUnmounted(() => window.eyas?.removeListener(...)), across the ~15 components that use receive()
