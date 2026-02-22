# Pre-Deployment Tests

- Test `npm run dev` that app loads
- Test `npm run dev:win:installer` that installer loads a db file
- Test that version comparator works

# Deployment Process

- Start a new `release` branch off `main`
- Run `npm run bump:build`
- Draft a new GitHub release; do not publish ( https://github.com/cycosoft/Eyas/releases )

- Generate Windows artifact -> `npm run compile:win:installer`

- Add to release draft `.runners/EyasInstaller.msi`
- Generate .pkg -> `npm run compile:mac:installer`
- Add to release draft:
  - `.runners/EyasInstaller.pkg`
  - macOS updater zip (e.g. `.runners/mac-arm64/Eyas-<version>-mac-arm64.zip` or equivalent from build output)
  - `latest.yml` (from Windows build output, e.g. `.runners/` or platform subdir)
  - `latest-mac.yml` (from macOS build output, e.g. `.runners/mac-arm64/` or equivalent)
- Merge `release` branch into `main`
- Tag latest commit with the version -> `git tag -a v26.2.32810 -m "v26.2.32810"`
- Select latest tag & publish GitHub release
