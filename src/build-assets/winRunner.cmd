@echo off

:: module definitions
set npmName=npm
set npmVersion=10.2.0

:: set the node download based on the processor architecture
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" set nodeName=node-win-x64
if "%PROCESSOR_ARCHITECTURE%"=="x86" set nodeName=node-win-x86
if "%PROCESSOR_ARCHITECTURE%"=="ia32" set nodeName=node-win-x86
set nodeVersion=20.7.0

:: create node_modules folder if it doesn't exist
if not exist node_modules mkdir node_modules
if not exist node_modules\.bin mkdir node_modules\.bin
if not exist node_modules\.downloads mkdir node_modules\.downloads

:: download NPM if it doesn't exist yet
if not exist node_modules\%npmName% CALL getDependency.cmd %npmName% %npmVersion%

:: download Node if the initial runner doesn't exist AND if `npm i` hasn't run
if not exist node_modules\%nodeName% if not exist node_modules\node CALL getDependency.cmd %nodeName% %nodeVersion%

:: remove the downloads directory
rmdir /s /q node_modules\.downloads

:: Set the working directory to the directory of the script
cd /d "%~dp0"

:: temporarily set the PATH to the local installation of node
set PATH=%cd%\node_modules\.bin;%PATH%

:: Install npm and node properly if `npm i` hasn't been run yet
if not exist node_modules\node CALL node node_modules\npm\bin\npm-cli.js i npm@%npmVersion% node@%nodeVersion%

:: output a blank line
echo.

:: Run Eyas
CALL npm start