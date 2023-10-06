#!/bin/bash

# Set the working directory to the directory of the script
cd "$(dirname "$0")"

# Update the PATH to the local installation for this session only
export PATH=./node_modules/.bin:$PATH

# Install and run the project
npm start