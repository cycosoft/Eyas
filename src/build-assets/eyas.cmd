@ECHO off
SET dp0=%~dp0
@REM ECHO "%dp0%node_modules\.bin\node"
@REM ECHO "%dp0%node_modules\.bin\electron"
@REM SET NODE_PATH="%dp0%node_modules"
SET PATH=%dp0%node_modules\.bin;%PATH%
ECHO "NODE Path:"
WHERE NODE
ECHO ************
set ELECTRON_RUN_AS_NODE=true
CALL "%dp0%node_modules\.bin\electron" test/index.html
PAUSE