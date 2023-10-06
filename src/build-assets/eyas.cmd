@echo off

:: module definitions
set npmName=npm
set npmVersion=10.2.0

set nodeName=node
set nodeVersion=20.7.0

set nodeBinSetupName=node-bin-setup
set nodeBinSetupVersion=1.1.3

set nodeWinx64Name=node-win-x64
set nodeWinx64Version=20.7.0

:: create node_modules folder if it doesn't exist
if not exist node_modules mkdir node_modules
if not exist node_modules\.bin mkdir node_modules\.bin
if not exist node_modules\.downloads mkdir node_modules\.downloads

:: only download if the packages doesn't exist
if not exist node_modules\%npmName% CALL installModule.cmd %npmName% %npmVersion%
@REM if not exist node_modules\%nodeName% CALL installModule.cmd %nodeName% %nodeVersion%
@REM if not exist node_modules\%nodeBinSetupName% CALL installModule.cmd %nodeBinSetupName% %nodeBinSetupVersion%
if not exist node_modules\%nodeWinx64Name% CALL installModule.cmd %nodeWinx64Name% %nodeWinx64Version%

:: remove the downloads directory
rmdir /s /q node_modules\.downloads

:: Set the working directory to the directory of the script
@REM cd /d "%~dp0"

:: temporarily set the PATH to the local installation of node
@REM set PATH=%cd%\node_modules\.bin;%PATH%

:: Run the node and electron commands
@REM CALL "%dp0%node_modules\.bin\node" "%dp0%node_modules\.bin\npm" -v

PAUSE