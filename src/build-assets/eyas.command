#!/bin/bash

##### ##### ##### ##### ##### ##### ##### ##### #####
# Make this file executable with the following command:
# chmod +x ./eyas.command
##### ##### ##### ##### ##### ##### ##### ##### #####

# Set the working directory to the directory of the script
cd "$(dirname "$0")"

# Run the node and electron commands
./node_modules/.bin/node ./node_modules/.bin/electron index.js --dev