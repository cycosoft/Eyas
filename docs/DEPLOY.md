# Pre-Deployment Tests

- Test `npm run dev` that app loads
- Test `npm run dev:win:installer` that installer loads a db file
- Test that version comparator works

# Deployment Process

- Start a new `release` branch off `main`
- Run `npm run bump:build`
- Draft a new GitHub release; do not publish ( https://github.com/cycosoft/Eyas/releases )
- Generate Windows artifact -> `npm run compile:win:installer`
- Add latest.yml to release draft `.runners/latest.yml`
- Add installer to release draft `.runners/EyasInstaller-win.exe`
- Generate .pkg -> `npm run compile:mac:installer`
- Add latest.yml to release draft `.runners/latest-mac.yml`
- Add installer to release draft `.runners/EyasInstaller-mac.pkg`
- Merge `release` branch into `main`
- Tag latest commit with the version -> `git tag -a v26.2.34056 -m "v26.2.34056"`
- Select latest tag & publish GitHub release
