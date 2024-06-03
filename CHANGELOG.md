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
- The verion of Eyas that built the bundle is now appended to the bundled config file
- Swapped the automatic build version from branch to short commit hash
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