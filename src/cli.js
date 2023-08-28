#!/usr/bin/env node

/* global __dirname process */

const { spawn } = require(`child_process`);
const electron = require(`electron`);
const path = require(`path`);

// import the package.json file
const package = require(path.join(__dirname, `package.json`));

// get the path to the eyas entry point
const eyasPath = path.join(__dirname, package.main);

// run the electron app
const child = spawn(electron, [eyasPath], {
	stdio: `inherit`,
	windowsHide: false,
	cwd: process.cwd()
});

// handle the child process exit
child.on(`close`, function (code, signal) {
	if(code === null) {
		// eslint-disable-next-line no-console
		console.error(electron, `exited with signal`, signal);
		process.exit(1);
	}

	process.exit(code);
});

// handle termination signals
const handleTerminationSignal = function (signal) {
	process.on(signal, function signalHandler () {
		if (!child.killed) {
			child.kill(signal);
		}
	});
};

// run the signal handlers
handleTerminationSignal(`SIGINT`);
handleTerminationSignal(`SIGTERM`);
