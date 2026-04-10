# Pre-Deployment Tests

- Test `npm run dev` that app loads
- Test `npm run dev:installer` that installer loads a db file

# Deployment Process

- Start a new `release` branch off `main`
- Run `npm run bump:build`; version should update in `package.json` and `changelog.json`
- Draft a new GitHub release; do not publish ( https://github.com/cycosoft/Eyas/releases )
- Generate Windows artifact -> `npm run compile:installer`
- Add latest.yml to release draft `.runners/latest.yml`
- Add installer to release draft `.runners/EyasInstaller-win.exe`
- Generate .pkg -> `npm run compile:mac:installer`
- Add latest.yml to release draft `.runners/latest-mac.yml`
- Add installer to release draft `.runners/EyasInstaller-mac.pkg`
- Merge `release` branch into `main`
- Tag latest commit with the version -> `git tag -a v26.4.15325 -m "v26.4.15325"`
- Select latest tag & publish GitHub release
