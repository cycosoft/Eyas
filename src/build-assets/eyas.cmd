@echo off

REM Set the working directory to the directory of the script
cd /d "%~dp0"

REM temporarily set the PATH to the local installation of node
set PATH=%cd%\node_modules\.bin;%PATH%

REM Run the node and electron commands
npm i && electron . --dev