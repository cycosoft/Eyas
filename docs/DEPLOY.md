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
- Add to release draft:
  - `.runners/EyasInstaller.pkg`
  - macOS updater zip (e.g. `.runners/mac-arm64/Eyas-<version>-mac-arm64.zip` or equivalent from build output)
  - `latest.yml` (from Windows build output, e.g. `.runners/` or platform subdir)
  - `latest-mac.yml` (from macOS build output, e.g. `.runners/mac-arm64/` or equivalent)
- Publish GitHub release
