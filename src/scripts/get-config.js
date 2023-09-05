'use strict';

// imports
const paths = require(`./paths`);
const { execSync } = require(`child_process`);

// setup
const userConfig = require(paths.config.source);

// error checking for config
userConfig.test = userConfig.test || {};
userConfig.outputs = userConfig.outputs || {};

// configuration merge and validation step
const eyasConfig = {
	test: {
		source: userConfig.test.source || `dist`,
		port: userConfig.test.port || 3000,
		domain: userConfig.test.domain || null,
		title: (userConfig.test.title || `Eyas`).trim(),
		version: (userConfig.test.version || getBranchName() || `Unspecified Version`).trim(),
		// { label: `SD Desktop`, width: 1024, height: 768 },
		resolutions: userConfig.test.resolutions || [],
		menu: userConfig.test.menu || []
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

// attempts to return the current branch name
function getBranchName() {
	try {
		return execSync(`git rev-parse --abbrev-ref HEAD`).toString();
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(`Error getting branch name:`, error);
		return null;
	}
}