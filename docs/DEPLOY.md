# Pre-Deployment Tests

- Test `npm run dev` that app loads
- Test `npm run dev:win:installer` that installer loads a db file
- Test that version comparator works

# Deployment Process

- tag the commit with the version -> `git tag -a v4.0.0 -m "v4.0.0"`
- Draft a new GitHub release; do not publish ( https://github.com/cycosoft/Eyas/releases )
- Generate .msi -> `npm run compile:win:installer`
- Add to release draft `.runners/EyasInstaller.msi`
- Generate .pkg -> `npm run compile:mac:installer`
- Add to release draft `.runners/EyasInstaller.pkg`
- Publish GitHub release
