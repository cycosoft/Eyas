# TODO

- In one of the tests I did, the last "open the demo window" failed to close
- what happens when the test enounters an error like "page not found"?
- what happens when the test enounters an error like broken JS?
- what happens when the test generaly can't follow the steps?
- How are test failures shown to the user?
- show an animated inside ring where the test window is displayed
- can we put the overlay for popup windows to prevent interactions there?
- the last step in playback animation on recording button should go to 100% before disappearing
- the test layer animation needs to be z-index _under_ the header items like tooltips and menus
- we do not appear to be cleaning up old recording sessions
- we should add a "demo mode" speed test replay speed
- are we still keeping 300ms delay on github replays
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

- need a tooltip for the "online/offline" header button
- swap cache > clear and open list item positions
- surface a warning when replay's click-point hit-test falls back to the unverified bounding-box center (i.e. no line rect's center hit-tested back to the target element) — no UI currently exists to show per-step replay warnings, so this needs design first