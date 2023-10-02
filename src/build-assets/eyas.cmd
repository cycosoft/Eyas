@ECHO off
SET dp0=%~dp0
ECHO "%dp0%node_modules\.bin\node"
ECHO "%dp0%node_modules\.bin\electron"
CALL "%dp0%node_modules\.bin\node" "%dp0%node_modules\.bin\electron"
PAUSE