# v3.5.0

- Added support for loading tests via the web using a custom protocol. An `eyas.json` will be created in the source directory to deploy with your changes. Share tests with users by swapping the https protocol for eyas. (e.g. `https://branch-42.example.com/test` becomes `eyas://branch-42.example.com/test`). This will open Eyas and load the test.
- Added a demo at [eyas://cycosoft.com/eyas-demo](eyas://cycosoft.com/eyas-demo) to showcase the new feature.

# v3.4.1

- As Electron@31.3.1 does not support the file upload progress event in the renderer process, Eyas will polyfill this event to simulate the progress bar. It attempts to get more accurate after each use, but will never match the actual progress.
- Dependency updates
- Fix animations freezing when hiding the UI layer
- Hide the UI whenever navigating to a new url
- Request to close all modals when hiding the UI layer
- Stop outputting the local path to the test in the config
- Do not look for sibling asar files when getting the user's config via the CLI build step

# v3.4.0

- Prevent a second instance of Eyas from running
- Added shortcut keys for menu items
- Fix the version modal not displaying on open if there aren't multiple given test domains
- Change the devtools for the test to work on any open window
- Show a globe icon for external links in the "Links" menu
- Allow escape to close the exit modal
- Allow enter to exit the app from the exit modal
- Add numbered hotkeys to the environment selection modal
- Refactor how modals and their background content is managed
- General README.md updates
- Updated analytics information gathered. See [METRICS.md](docs/METRICS.md)
- Move the UI layer to its own protocol
- Fix devtools "network offline" mode not working
- Added a new Network menu with navigation options and ability to disable network
- Add new "tool" menu item to copy the current URL to the clipboard
- Give each testId its own session and cache that can be cleared independently. Cache is now maintained between test runs.

# v3.3.0

- Disable "one-click" install for Windows installer
- Update project dependencies
- Add WebdriverIO test runner
- Set the UI layer to always have blurred background when set as visible
- Fix issue displaying the UI layer without controls when the window is resized, making Eyas appear unresponsive.
- Make the file name safe when creating the artifact name
- Support "Single Page Apps" by falling back to root index file if the given path + file doesn't exist
- Add a splash screen on app load
- Fix version mismatch checking

# v3.2.2

- Fix all custom links with variables only being opened externally
- Fix UI layer hiding when app in resized
- Address unsanitized user input concern via ( https://github.com/cycosoft/Eyas/security/code-scanning/1 )

# v3.2.1

- Fix compiled runner failing to load test due to missing dependency

# v3.2.0

- Rename menu item "New Test" to "Reset Test"
- Add ability to generate `.msi` and `.pkg` installers (module development)
- Associated `*.eyas` files with installed version of Eyas
- Refactor config load order (via user click, sibling *.eyas to runner, or via sibling config + defined source)
- Allow CLI to generate just *.eyas files without bundling a runner
- Alert user to possible Eyas update if test was built with newer version
- Fix the UI hiding when there are multiple modals visible

# v3.1.0

- Test files and user config are now bundled together in a read-only archive with an `*.eyas` extension. Eyas will automatically load the first archive it finds in the current working directory, with a fallback to previous behavior.
- Update to electron@31.0.0
- Update readme with tip and warnings for production testing.
- Fix interface modals being visible at incorrect times

# v3.0.0

- General menu adjustments
- Display an alert about `etc/hosts` when user tries to load test files in the browser
- Add a spinner to the app close button
- Support for multiple domains via config
- Complete restructure of the core app code
- Run user test via custom protocol instead of http server
- Removed ability to run user test in the browser
- Add support for custom links with variables
- Swap the "viewport" and "links" button positions in the menu
- Removed the ability to set custom redirect rules
- Fix inability to load a test url with a port
- Removed the ability to explicitly set a custom port
- Updated support references to GitHub ( https://github.com/cycosoft/Eyas/issues )
- The version of Eyas that built the bundle is now appended to the bundled config file
- Updated automatic build version to include short commit hash
- Ensure the test cache is always cleared when Eyas starts or test is reloaded

# v2.0.0

- Eyas now ships with a pre-built executable, rather than requiring the user to build it. Bundling your app is now a much faster and simpler process.
- Removed Linux support
- Removed config settings for "executable" and "portable" builds
- Changed CLI command from `compile` to `bundle`
- Removed CLI command `preview`
- Updated dependencies
- Flatten config options
- Rename runners from `Eyas` to `Start`

# v1.1.2

- Updated: Dependencies
- Link package.json to GitHub repo

# v1.1.1

- Updated: Dependencies
- Updated: Readme clarification
- Removed: `bytenode` dependency and usage of

# v1.1.0

- Added: "Portable" output type
- Added: Build expiration for every build with optional override
- Added: Build metadata to the about dialog
- Updated: Eyas exit dialog
- Updated: Outputs are always zipped
- Removed: Ability to set compression level for outputs

# v1.0.1

- Updated: Rebuilt CLI

# v1.0.0

- Added: User configuration. See [README.md](README.md)
- Added: CLI
- Added: Ability to preview app without building distributables
- Added: Ability to build platform specific distributables
- Added: Custom viewports
- Added: Custom menu item of associated URLs
- Added: Open any link in external browser