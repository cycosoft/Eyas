@echo off

REM Set the working directory to the directory of the script
cd /d "%~dp0"

REM Update the PATH to the local installation for this session only
set PATH=%cd%\node_modules\.bin;%PATH%

REM Install and run the project
npm start