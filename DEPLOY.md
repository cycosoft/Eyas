# Updating the NPM package

* use mac
* compile, sign, notarize .app -> `npm run compile:mac`
* switch to windows
* compile .exe -> `npm run compile:win:module`
* verify signature -> `npm run sign:win:verify`
* send /dist/runners/Start.exe to mac
* switch to mac
* put .exe in dist/runners/
* test -> `npm pack`
* deploy -> `npm publish`
* tag the commit with the version -> `git tag -a v3.2.0 -m "v3.2.0"`


# Updating the installer

* use windows
* compile .msi -> `npm run compile:win:installer`
* copy from `.runners/EyasInstaller.msi`
* use MacOS
* compike .pkg -> `npm run compile:mac:installer`
* copy from `.runners/EyasInstaller.pkg`