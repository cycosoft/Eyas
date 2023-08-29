#!/usr/bin/env node

/* global __dirname process */

'use strict';

// Allow for "root" await calls
(async () => {
	// import dependencies
	const { program: cli } = await import(`commander`);
	const inquirer = await import(`inquirer`);

	// define the details for the CLI help
	cli
		.name(`eyas`)
		.description(`A serverless testing container for web applications`)
		.version(process.env.npm_package_version);

	// when the user runs the `config` command
	cli
		.command(`config`)
		.description(`Launch the Eyas configuration editor`)
		.action(() => {
			console.log(`config command received`);
		});

	// when the user runs the `preview` command
	cli
		.command(`preview`)
		.description(`Launch Eyas with the current configuration`)
		.action(() => {
			console.log(`preview command received`);
		});

	// when the user runs the `compile` command
	cli
		.command(`compile`)
		.description(`Bundle and compile the current configuration for deployment`)
		.action(() => {
			console.log(`compile command received`);
		});

	// if there are arguments
	if(process.argv.slice(2).length) {
		// parse the arguments
		cli.parse();
	}else{
		// ask the user what they want to do
		console.log(`No arguments passed`);
	}
})();


// const { spawn } = require(`child_process`);
// const electron = require(`electron`);
// const path = require(`path`);

// // import the package.json file
// const packageJson = require(path.join(process.cwd(), `package.json`));

// // get the path to the eyas entry point
// const eyasPath = path.join(__dirname, packageJson.main);

// // run the electron app
// const child = spawn(electron, [eyasPath], {
// 	stdio: `inherit`,
// 	windowsHide: false,
// 	cwd: process.cwd()
// });

// // handle the child process exit
// child.on(`close`, function (code, signal) {
// 	if(code === null) {
// 		// eslint-disable-next-line no-console
// 		console.error(electron, `exited with signal`, signal);
// 		process.exit(1);
// 	}

// 	process.exit(code);
// });

// // handle termination signals
// const handleTerminationSignal = function (signal) {
// 	process.on(signal, function signalHandler () {
// 		if (!child.killed) {
// 			child.kill(signal);
// 		}
// 	});
// };

// // run the signal handlers
// handleTerminationSignal(`SIGINT`);
// handleTerminationSignal(`SIGTERM`);
