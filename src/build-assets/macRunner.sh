#!/bin/sh

# module definitions
npmName=npm
npmVersion=10.2.0
nodeName=node-bin-darwin-arm64
nodeVersion=20.7.0

installModule(){
    # $1 is the name of the npm package
    # $2 is the version of the npm package

    # let the user know what's downloading
    echo Downloading $1 $2

    # create the folder for the package
    mkdir node_modules/$1

    # download the package
    curl -L https://registry.npmjs.org/$1/-/$1-$2.tgz -o node_modules/.downloads/$1.tgz

    # extract the package
    tar -xzf node_modules/.downloads/$1.tgz -C node_modules/$1 --strip-components=1

    # if there's a package bin folder, copy its contents to the parent .bin folder
    if [ -d "node_modules/$1/bin" ]; then
        cp -R node_modules/$1/bin/* node_modules/.bin/
    fi
}

# create node_modules folder if it doesn't exist
mkdir -p node_modules
mkdir -p node_modules/.bin
mkdir -p node_modules/.downloads

# download NPM if it doesn't exist yet
if [ ! -d "node_modules/$npmName" ]; then
    installModule $npmName $npmVersion
fi

# download Node if the initial runner doesn't exist AND if `npm i` hasn't run
if [ ! -d "node_modules/$nodeName" ] && [ ! -d "node_modules/node" ]; then
    installModule $nodeName $nodeVersion
fi

# remove the downloads directory
rm -rf node_modules/.downloads

# Install npm and node properly if `npm i` hasn't been run yet
if [ ! -d "node_modules/node" ]; then
    node node_modules/npm/bin/npm-cli.js i npm@$npmVersion node@$nodeVersion
fi

# temporarily set the PATH to the local installation of node
export PATH="$(pwd)/node_modules/.bin:$PATH"

# Set the working directory to the directory of the script
cd "$(dirname "$0")"

# Run Eyas
npm start
