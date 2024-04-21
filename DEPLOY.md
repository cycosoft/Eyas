* use mac
* compile, sign, notarize .app -> `compile:mac`
* switch to windows
* compile .exe -> `npm run compile:win`
* sign .exe -> `sign:win`
* verify signature -> `sign:win:verify`
* send .exe to mac
* switch to mac
* put .exe in dist/
* deploy -> `npm publish`