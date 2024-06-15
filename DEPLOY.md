# Updating the NPM package

* use mac
* compile, sign, notarize .app -> `npm run compile:mac`
* switch to windows
* compile .exe -> `npm run compile:win`
* sign .exe -> `npm run sign:win`
* verify signature -> `npm run sign:win:verify`
* send /dist/runners/Start.exe to mac
* switch to mac
* put .exe in dist/runners/
* test -> `npm pack`
* deploy -> `npm publish`
* tag the commit with the version -> `git tag -a v3.1.0 -m "v3.1.0"`


# Updating the Windows installer

* use windows
* compile .msi -> `npm run compile:win:msi`
* copy from `.runners/Eyas.msi`