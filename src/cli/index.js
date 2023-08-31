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
async function runCommand_compile() {
	// imports
	const fs = require(`fs-extra`);
	const path = require(`path`);
	const packager = require(`electron-packager`);

	// setup
	const pathRoot = process.cwd();
	const names = {
		input: `.eyas-preview`, // https://kinsta.com/knowledgebase/nodejs-fs/#how-to-create-a-temporary-directory
		output: `.eyas-dist`,
		config: `.eyasrc.js`,
		assets: `assets`
	};
	const paths = {
		buildInput: path.join(pathRoot, names.input),
		buildOutput: path.join(pathRoot, names.output),
		assetsInput: path.join(pathRoot, names.assets),
		assetsOutput: path.join(pathRoot, names.input, names.assets),
		eyasMain: path.join(pathRoot, `dist`, `main`),
		userSourceOutput: path.join(pathRoot, names.input, `user`),
		configInput: path.join(pathRoot, names.config),
		configOutput: path.join(pathRoot, names.input, names.config)
	};

	// delete any existing build folders
	await fs.remove(paths.buildInput);
	await fs.remove(paths.buildOutput);

	// create the temp folder to work in
	await fs.ensureDir(paths.buildInput);

	// copy dist/main/*.* to .eyas/
	await fs.copy(paths.eyasMain, paths.buildInput);

	// load the users config file as it could contain dynamic values
	const config = require(paths.configInput);

	// adjust the config to manage any missing values (move from eyas.js)
	// this might need to be a shared script
	// this needs to resolve properties that are functions

	// create a new file with the users snapshotted config values
	const data = `module.exports = ${JSON.stringify(config, null, 2)}`;
	console.log(data);
	await fs.outputFile(paths.configOutput, data);
	return;

	// copy the users source files to the folder .eyas/user/
	const userSourceInput = path.join(pathRoot, config.testSourceDirectory);
	await fs.cp(userSourceInput, paths.userSourceOutput);

	// copy any assets to the folder .eyas/assets/
	await fs.cp(paths.assetsInput, paths.assetsOutput);

	// create electron executable for the requested platforms with the files from .eyas to user's designated output path (or default '.eyas-dist/')
	const appPaths = await packager({
		appCopyright: `2023`,
		appVersion: config.version,
		buildVersion: process.env.npm_package_version,
		dir: `.eyas`,
		executableName: `${config.appTitle} - ${config.buildVersion}`,
		icon: path.join(paths.assetsInput, `eyas-logo.png`),
		name: `Eyas`,
		out: names.output,
		overwrite: true,
		win32metadata: {
			CompanyName: `Cycosoft, LLC`,
			ProductName: `Eyas`
		}
	});

	// let the user know where the output is
	console.log(`Output created at: ${appPaths.join(`, `)}`);

	// delete the temp .eyas folder
	await fs.rm(paths.buildInput, { recursive: true, force: true });
}
