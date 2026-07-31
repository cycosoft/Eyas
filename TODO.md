# TODO

- Update changelog.json


# Future

- should we just focus the testid that's already open if the user attempts to open it a second time? is this possible? (vs a warning about opening two instances of the same testid)
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
