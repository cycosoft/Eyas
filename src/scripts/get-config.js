'use strict';

// imports
const paths = require(`./paths`);

// load the user's config file
const config = require(paths.config.source);

// adjust the config to manage any missing values (move from eyas.js)
// this might need to be a shared script
// this needs to resolve properties that are functions

// export the config for the project
module.exports = config;
