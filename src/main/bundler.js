#!/usr/bin/env node

/* global process */

'use strict';

// Allow for "root" await calls
(async () => {
	console.log(`Hello World!`);

	// create a folder to work in (.eyas/)
	// copy the eyas.min.js file to the folder
	// load the users config file as it could contain dynamic values
	// adjust the config to manage any missing values (move from eyas.js to bundler.js)
	// create a new file with the users snapshotted config values
	// copy the users source files to the folder .eyas/user/
	// copy any assets to the folder .eyas/assets/
	// create electron executable for the requested platforms with the files from .eyas to users designated output path
	// delete the .eyas folder


	// DEV ONLY (TO BE REMOVED)
	// pauseExit();

	// TESTING ONLY: Pause the process to allow for debugging
	function pauseExit() {
		const readline = require(`readline`);
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		rl.question(`Press Enter to exit...`, () => {
			rl.close();
		});
	}
})();