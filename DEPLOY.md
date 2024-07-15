# Pre-Deployment Tests

- Test `npm run dev` that app loads
- Test `npm run dev:win:cli` that portable bundle loads
- Test `npm run dev:win:installer` that installer loads a db file
- Test that version comparator works

# Deployment Process

- tag the commit with the version -> `git tag -a v3.3.0 -m "v3.3.0"`
- Draft a new GitHub release; do not publish ( https://github.com/cycosoft/Eyas/releases )
- Generate .msi -> `npm run compile:win:installer`
- Add to release draft `.runners/EyasInstaller.msi`
- compile .exe -> `npm run compile:win:module`
- send `/dist/runners/Start.exe` to Mac
- Generate .pkg -> `npm run compile:mac:installer`
- Add to release draft `.runners/EyasInstaller.pkg`
- compile, sign, notarize .app -> `npm run compile:mac`
- Place .exe to `dist/runners/`
- Final Test - Module in another project -> `npm pack`
- Deploy to NPM -> `npm publish`
- Publish GitHub release
