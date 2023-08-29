#!/usr/bin/env node

/* global process */

'use strict';

// Allow for "root" await calls
(async () => {
	// import dependencies
	const { program: cli } = await import(`commander`);

	// define the commands for the CLI
	defineCommands(cli);

	// if arguments were passed to the script
	if(process.argv.slice(2).length) {
		// parse the arguments and run the commands
		cli.parse();
	}else{
		// fall back to asking the user how to proceed
		defaultEntry();
	}
})();

// ask the user what they want to do
async function defaultEntry() {
	const inquirer = await import(`inquirer`);

	inquirer
		.prompt([
			{
				type: `list`,
				name: `action`,
				message: `What would you like to do?`,
				choices: [`Configure`, `Preview`, `Compile`]
			}
		])
		.then(answers => {
			// Use user feedback for... whatever!!
			console.log(answers);
		});
}

// launch the configuration editor
function runCommand_config() {
	console.log(`config command received`);
}

// launch a preview of the consumers application
function runCommand_preview() {
	console.log(`preview command received`);
}

// compile the consumers application for deployment
function runCommand_compile() {
	console.log(`compile command received`);
}

// define the commands for the CLI
function defineCommands(cli) {
	// define the details for the CLI help
	cli
		.name(`eyas`)
		.description(`A serverless testing container for web applications`)
		.version(process.env.npm_package_version);

	// when the user runs the `config` command
	cli
		.command(`config`)
		.description(`Launch the Eyas configuration editor`)
		.action(runCommand_config);

	// when the user runs the `preview` command
	cli
		.command(`preview`)
		.description(`Launch Eyas with the current configuration`)
		.action(runCommand_preview);

	// when the user runs the `compile` command
	cli
		.command(`compile`)
		.description(`Bundle and compile the current configuration for deployment`)
		.action(runCommand_preview);
}


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
