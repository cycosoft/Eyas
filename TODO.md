# TODO

[IPC-HANDLERS-RECORDER] playback failed: TypeError: Cannot read properties of undefined (reading 'isDestroyed')
    at Object.toggleEyasUI (file:///Users/erichigginson/repos/eyas/out/main/index.js:631:55)
    at Object.toggleEyasUI (file:///Users/erichigginson/repos/eyas/out/main/index.js:2645:55)
    at _dispatchAllSteps (file:///Users/erichigginson/repos/eyas/out/main/index.js:2097:9)
    at async Object.playSession (file:///Users/erichigginson/repos/eyas/out/main/index.js:2114:3)




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
- consumer users custom protocol to launch desktop app, but eyas swallows this and the user doesn't see a prompt.
- what happens when the test enounters an error like "page not found"?
- what happens when the test enounters an error like broken JS?
- what happens when the test generaly can't follow the steps?
- How are test failures shown to the user?
