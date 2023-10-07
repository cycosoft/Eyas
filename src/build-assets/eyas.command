#!/bin/bash

# module definitions
npmName=npm
npmVersion=10.2.0
nodeWinx64Name=node-bin-darwin-arm64
nodeWinx64Version=20.7.0

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

# only download if the packages don't exist
if [ ! -d "node_modules/$npmName" ]; then
    installModule $npmName $npmVersion
fi

if [ ! -d "node_modules/$nodeWinx64Name" ]; then
    installModule $nodeWinx64Name $nodeWinx64Version
fi

# remove the downloads directory
rm -rf node_modules/.downloads

# Set the working directory to the directory of the script
cd "$(dirname "$0")"

# temporarily set the PATH to the local installation of node
export PATH="$(pwd)/node_modules/.bin:$PATH"

# use node to run npm
node node_modules/npm/bin/npm-cli.js "$@" start
