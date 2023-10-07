@echo off

:: module definitions
set npmName=npm
set npmVersion=10.2.0
set nodeWinx64Name=node-win-x64
set nodeWinx64Version=20.7.0

:: create node_modules folder if it doesn't exist
if not exist node_modules mkdir node_modules
if not exist node_modules\.bin mkdir node_modules\.bin
if not exist node_modules\.downloads mkdir node_modules\.downloads

:: only download if the packages don't exist
if not exist node_modules\%npmName% CALL installModule.cmd %npmName% %npmVersion%
if not exist node_modules\%nodeWinx64Name% CALL installModule.cmd %nodeWinx64Name% %nodeWinx64Version%

:: remove the downloads directory
rmdir /s /q node_modules\.downloads

:: Set the working directory to the directory of the script
cd /d "%~dp0"

:: temporarily set the PATH to the local installation of node
set PATH=%cd%\node_modules\.bin;%PATH%

:: use node to run npm
CALL node node_modules\npm\bin\npm-cli.js %* start