#!/bin/bash

# Set the working directory to the directory of the script
cd "$(dirname "$0")"

# temporarily set the PATH to the local installation of node
export PATH=./node_modules/.bin:$PATH

# Run the node and electron commands
electron . --dev