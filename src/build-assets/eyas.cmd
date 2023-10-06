@echo off

:: module definitions
set npmName=npm
set npmVersion=10.2.0

set nodeName=node
set nodeVersion=20.7.0

set nodeBinSetupName=node-bin-setup
set nodeBinSetupVersion=1.1.3

:: create node_modules folder if it doesn't exist
if not exist node_modules mkdir node_modules
if not exist node_modules\.bin mkdir node_modules\.bin
if not exist node_modules\.downloads mkdir node_modules\.downloads

:: only download if the

:: only download if the packages doesn't exist
if not exist node_modules\%npmName% goto downloadNpm
if not exist node_modules\%nodeName% goto downloadNode
if not exist node_modules\%nodeBinSetupName% goto downloadNodeBinSetup

:downloadNpm
:: let the user know what's downloading
echo Downloading %npmName% %npmVersion%
mkdir node_modules\%npmName%
curl -L https://registry.npmjs.org/%npmName%/-/%npmName%-%npmVersion%.tgz -o node_modules\.downloads\%npmName%.tgz
tar -xzf node_modules\.downloads\%npmName%.tgz -C node_modules\%npmName%
move node_modules\%npmName%\package\* node_modules\%npmName%
goto :EOF

:downloadNode
:: let the user know what's downloading
echo Downloading %nodeName% %nodeVersion%
mkdir node_modules\%nodeName%
curl -L https://registry.npmjs.org/%nodeName%/-/%nodeName%-%nodeVersion%.tgz -o node_modules\.downloads\%nodeName%.tgz
tar -xzf node_modules\.downloads\%nodeName%.tgz -C node_modules\%nodeName%
move node_modules\%nodeName%\package\* node_modules\%nodeName%
goto :EOF

:downloadNodeBinSetup
:: let the user know what's downloading
echo Downloading %nodeBinSetupName% %nodeBinSetupVersion%
mkdir node_modules\%nodeBinSetupName%
curl -L https://registry.npmjs.org/%nodeBinSetupName%/-/%nodeBinSetupName%-%nodeBinSetupVersion%.tgz -o node_modules\.downloads\%nodeBinSetupName%.tgz
tar -xzf node_modules\.downloads\%nodeBinSetupName%.tgz -C node_modules\%nodeBinSetupName%
move node_modules\%nodeBinSetupName%\package\* node_modules\%nodeBinSetupName%
goto :EOF

:: remove the downloads directory
rmdir /s /q node_modules\.downloads


:: Set the working directory to the directory of the script
@REM cd /d "%~dp0"

:: temporarily set the PATH to the local installation of node
@REM set PATH=%cd%\node_modules\.bin;%PATH%

:: Run the node and electron commands
@REM CALL "%dp0%node_modules\.bin\node" "%dp0%node_modules\.bin\npm" -v

PAUSE