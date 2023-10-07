#!/bin/bash

# module definitions
npmName=npm
npmVersion=10.2.0
nodeWinx64Name=node-win-x64
nodeWinx64Version=20.7.0

# create node_modules folder if it doesn't exist
mkdir -p node_modules
mkdir -p node_modules/.bin
mkdir -p node_modules/.downloads

# only download if the packages don't exist
if [ ! -d "node_modules/$npmName" ]; then
    ./installModule.sh $npmName $npmVersion
fi

if [ ! -d "node_modules/$nodeWinx64Name" ]; then
    ./installModule.sh $nodeWinx64Name $nodeWinx64Version
fi

# remove the downloads directory
rm -rf node_modules/.downloads

# Set the working directory to the directory of the script
cd "$(dirname "$0")"

# temporarily set the PATH to the local installation of node
export PATH="$(pwd)/node_modules/.bin:$PATH"

# use node to run npm
node node_modules/npm/bin/npm-cli.js "$@" start
