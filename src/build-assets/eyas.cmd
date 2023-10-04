@ECHO off
SET dp0=%~dp0
@REM ECHO "%dp0%node_modules\.bin\node"
ECHO "%dp0%node_modules\.bin\electron"
@REM SET NODE_PATH="%dp0%node_modules"
set ELECTRON_ENABLE_LOGGING=true
CALL "%dp0%node_modules\.bin\node" "%dp0%node_modules\.bin\electron" test/index.html
PAUSE