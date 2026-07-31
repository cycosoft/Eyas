# TODO

- See # Multi-Instance Support below
- Update changelog.json


# Future

- is zoom remembered? should we remember it per project?
- we should add a "demo mode" speed test replay speed that people can use for showing off to a group over video chat (maybe like 500ms)
- need a tooltip for the "online/offline" header button
- swap cache > clear and open list item positions
- a consumer of eyas has a custom protocol (hs://) to launch their desktop app, but eyas swallows the browser prompt (or just never shows one?) and the user can't launch their application.
- running two Eyas instances at once (see # Multi-Instance Support) causes hovering the mouse over one window to auto-focus it as if it were the same app as the other instance — reproduced 2026-07-31, cause unknown, needs investigation separate from the sessionData/lock work below
- what happens when the test enounters an error like "page not found"?
- what happens when the test enounters an error like broken JS?
- what happens when the test generaly can't follow the steps?
- How are test failures shown to the user?
- support saving/organizing recordings: rename off `active-session.json` by start timestamp into `sessions/{projectId}/saved/`, which `getSession` already checks


# Multi-Instance Support

- `requestSingleInstanceLock()` in `src/eyas-core/index.ts:12-13` currently quits any second Eyas process outright — this must be removed/reworked before multiple instances can run at all
- `app.getPath('userData')` is OS-fixed, not per-process, so all instances share the same `settings.json` (`settings-service.ts:62`) and `credentials.json` (`credential-store.ts:18`) — writes are only serialized by an in-process save queue, so two instances writing settings around the same time can race (last writer wins)
- same-`projectId`-and-`testId` concurrent instances: proposed to reuse the existing single-instance-lock pattern but scoped to `testId` instead of the whole app — second instance for the same testId gets shut down like today's guard, but now shows a native dialog first so the user knows why. Needs its own design pass since Electron's `requestSingleInstanceLock()` is inherently app-wide (only one lock per app); testId isn't known until config loads, which happens after the current lock check runs today. Likely needs a custom per-testId lock file (PID + process start time, to avoid false positives from PID reuse after a crash) under `sessions/{projectId}/{testId}/`, checked after config load, overwritten (not deleted) on every acquisition
- confirmed 2026-07-31: running two instances of the same project without the single-instance lock produces a real Chromium error (`service_worker_storage.cc: Failed to delete the database`) — `sessionData` is shared/un-isolated across processes today, exactly as the original ticket predicted. Isolating it requires knowing `projectId`/`testId` before `app.whenReady()` (Chromium initializes the profile by then), but those currently only resolve after config load inside `handleReady` (`app.service.ts:257-259`) — needs an early lightweight peek at the launch arg (file path/protocol URL) to extract projectId/testId ahead of the full config load, so `app.setPath('sessionData', ...)` can be keyed on them before ready
- done: active recordings now live at `sessions/{projectId}/{testId}/active-session.json` (`session-recorder.service.ts`), so two instances on the same project but different builds/testIds no longer overwrite each other's active recording. Saved recordings (once that feature exists) will live one level up at `sessions/{projectId}/saved/{sessionId}.json` — projectId-scoped only, not testId — so a saved recording can be replayed against any build of the project it came from
