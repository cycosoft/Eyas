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

// define the actions for the CLI
const actions = {
	config: {
		enabled: false,
		label: `Configure`,
		description: `Launch the Eyas configuration editor`,
		command: `config`,
		action: runCommand_config
	},
	preview: {
		enabled: true,
		label: `Preview`,
		description: `Launch Eyas with the current configuration`,
		command: `preview`,
		action: runCommand_preview
	},
	compile: {
		enabled: true,
		label: `Compile`,
		description: `Bundle and compile Eyas with the current configuration for deployment`,
		command: `compile`,
		action: runCommand_compile
	}
};

// ask the user what they want to do
async function defaultEntry() {
	// import
	const inquirer = (await import(`inquirer`)).default;

	// ask the user what they want to do
	inquirer
		.prompt([
			{
				type: `list`,
				name: `action`,
				message: `What would you like to do?`,
				// create a map of the actions
				choices: Object.values(actions)
					.filter(action => action.enabled)
					.map(action => {
						return {
							name: action.label,
							value: action.command,
							short: action.description
						};
					})
			}
		])
		// run the selected action
		.then(({ action }) => actions[action].action());
}

// setup the CLI arguments
function defineCommands(cli) {
	// define the details of the CLI
	cli
		.name(`eyas`)
		.description(`A serverless testing container for web applications`)
		.version(process.env.npm_package_version);

	// define commands for the CLI from action object
	for(const action in actions) {
		// cache
		const cmd = actions[action];

		// skip if disabled
		if(!actions[action].enabled) { continue; }

		// define the argument with commander
		cli
			.command(cmd.command)
			.description(cmd.description)
			.action(cmd.action);
	}
}

// launch the configuration editor
function runCommand_config() {
	console.log(`config command received`);
}

// launch a preview of the consumers application
function runCommand_preview() {
	const { spawn } = require(`child_process`);
	const electron = require(`electron`);
	const path = require(`path`);

	// get the path to the eyas entry point
	const eyasPath = path.join(process.cwd(), `dist`, `main`, `index.js`);

	// run the electron app
	spawn(electron, [eyasPath], {
		stdio: `inherit`,
		windowsHide: false,
		cwd: process.cwd()
	});
}

// compile the consumers application for deployment
function runCommand_compile() {
	console.log(`compile command received`);
}
