'use strict';

// imports
const paths = require(`./paths`);

// setup
const config = require(paths.config.source);

// validation
const eyasConfig = {
	test: {
		source: `dist`,
		port: 3000,
		domain: ``,
		title: `Eyas`,
		version: ``, // current branch name
		resolutions: [
			// { label: `SD Desktop`, width: 1024, height: 768 },
		],
		menu: []
	},

	// defaults to current platform
	outputs: {
		maxCompression: false, // false
		windows: undefined, // undefined
		mac: undefined, // undefined
		linux: undefined // undefined
	}
};

// export the config for the project
module.exports = eyasConfig;