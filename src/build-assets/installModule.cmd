:: %1 is the name of the npm package
:: %2 is the version of the npm package

:: let the user know what's downloading
echo Downloading %1 %2

:: create the folder for the package
mkdir node_modules\%1

:: download the package
curl -L https://registry.npmjs.org/%1/-/%1-%2.tgz -o node_modules\.downloads\%1.tgz

:: extract the package
tar -xzf node_modules\.downloads\%1.tgz -C node_modules\%1 --strip-components=1

:: if there's a package bin folder, copy its contents to the parent .bin folder
if exist node_modules\%1\bin xcopy /s /y node_modules\%1\bin node_modules\.bin