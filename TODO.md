# TODO

- disable header controls during test run
-- Eyas > About
-- Eyas > Settings
-- Eyas > Check for Updates
-- Eyas > Changelog
-- browser back
-- browser forward
-- browser reload
-- browser home
-- links > *
-- environment dropdown
-- Update available button
-- tools > test server
-- tools > viewport
-- tools > cache


# Future

- we should add a "demo mode" speed test replay speed that people can use for showing off to a group over video chat (maybe like 500ms)
- need a tooltip for the "online/offline" header button
- swap cache > clear and open list item positions
- consumer users custom protocol to launch desktop app, but eyas swallows this and the user doesn't see a prompt.
- what happens when the test enounters an error like "page not found"?
- what happens when the test enounters an error like broken JS?
- what happens when the test generaly can't follow the steps?
- How are test failures shown to the user?
- support saving/organizing recordings: rename off `active-session.json` by start timestamp into `sessions/{projectId}/saved/`, which `getSession` already checks


# Multi-Instance Support

- `requestSingleInstanceLock()` in `src/eyas-core/index.ts:12-13` currently quits any second Eyas process outright — this must be removed/reworked before multiple instances can run at all
- `app.getPath('userData')` is OS-fixed, not per-process, so all instances share the same `settings.json` (`settings-service.ts:62`) and `credentials.json` (`credential-store.ts:18`) — writes are only serialized by an in-process save queue, so two instances writing settings around the same time can race (last writer wins)
- same-`projectId`-and-`testId` concurrent instances: proposed to reuse the existing single-instance-lock pattern but scoped to `testId` instead of the whole app — second instance for the same testId gets shut down like today's guard. Needs its own design pass since Electron's `requestSingleInstanceLock()` is inherently app-wide (only one lock per app); testId isn't known until config loads, which happens after the current lock check runs today. Likely needs a custom per-testId lock file (e.g. PID) under `sessions/{projectId}/{testId}/`, checked after config load, with stale-lock handling for crashed processes
- done: active recordings now live at `sessions/{projectId}/{testId}/active-session.json` (`session-recorder.service.ts`), so two instances on the same project but different builds/testIds no longer overwrite each other's active recording. Saved recordings (once that feature exists) will live one level up at `sessions/{projectId}/saved/{sessionId}.json` — projectId-scoped only, not testId — so a saved recording can be replayed against any build of the project it came from
