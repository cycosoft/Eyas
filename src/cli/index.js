#!/usr/bin/env node

/* global process, __dirname */

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

	// add a space from the previous output
	userLog(``);

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
	const eyasPath = path.join(process.cwd(), `.eyas-build`, `index.js`);

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
	const builder = require(`electron-builder`);
	const child_process = require(`child_process`);

	// setup
	const isProd = __dirname.includes(`node_modules`);
	const consumerRoot = process.cwd();
	const eyasRoot = isProd
		? path.join(consumerRoot, `node_modules`, `@cycosoft`, `eyas`)
		: consumerRoot;
	const names = {
		eyasBuild: `.eyas-build`,
		eyasDist: `.eyas-dist`,
		eyasAssets: `assets`,
		eyasPackage: `package.json`,
		userConfig: `.eyasrc.js`,
		userSource: `user`
	};
	const paths = {
		eyasBuild: path.join(consumerRoot, names.eyasBuild),
		eyasDist: path.join(consumerRoot, names.eyasDist),
		assetsFrom: path.join(eyasRoot, `src`, names.eyasAssets),
		assetsTo: path.join(consumerRoot, names.eyasBuild, names.eyasAssets),
		eyasRunnerSource: path.join(eyasRoot, `dist`, `eyas`),
		eyasRunner: path.join(consumerRoot, names.eyasBuild, `index.js`),
		userSourceTo: path.join(consumerRoot, names.eyasBuild, names.userSource),
		eyasPackageJsonFrom: path.join(eyasRoot, `dist`, names.eyasPackage),
		eyasPackageJsonTo: path.join(consumerRoot, names.eyasBuild, names.eyasPackage),
		userConfigFrom: path.join(consumerRoot, names.userConfig),
		userConfigTo: path.join(consumerRoot, names.eyasBuild, names.userConfig)
	};

	// log the start of the process
	userLog(``);

	// delete any existing build folders
	userLog(`Resetting build space...`);
	await fs.remove(paths.eyasBuild);
	await fs.remove(paths.eyasDist);

	// create the temp folder to work in
	userLog(`Creating build directory...`);
	await fs.ensureDir(paths.eyasBuild);

	// copy dist/main/*.* to .eyas/
	userLog(`Copying Eyas runtime files...`);
	await fs.copy(paths.eyasRunnerSource, paths.eyasBuild);

	// load the users config file as it could contain dynamic values
	userLog(`Loading user config...`);
	const config = require(paths.userConfigFrom);

	// adjust the config to manage any missing values (move from eyas.js)
	// this might need to be a shared script
	// this needs to resolve properties that are functions

	// create a new file with the users snapshotted config values
	const data = `module.exports = ${JSON.stringify(config, null, 2)}`;
	// console.log(data);
	userLog(`Creating snapshot of config...`);
	await fs.outputFile(paths.userConfigTo, data);

	// get the path to the users source files
	const userSourceInput = path.join(consumerRoot, config.testSourceDirectory);

	// point the config to the output folder for the users source files
	config.testSourceDirectory = names.userSource;

	// copy the users source files to the folder .eyas/user/
	userLog(`Copying user source...`);
	await fs.copy(userSourceInput, paths.userSourceTo);

	// copy any assets to the folder .eyas/assets/
	userLog(`Copying Eyas assets...`);
	await fs.copy(paths.assetsFrom, paths.assetsTo);

	// copy the package.json to the build folder
	userLog(`Copying package.json...`);
	await fs.copy(paths.eyasPackageJsonFrom, paths.eyasPackageJsonTo);

	// Install dependencies
	userLog(`Installing dependencies...`);
	child_process.execSync(`npm i`, { stdio: [0,1,2] });

	// create electron executable for the requested platforms with the files from .eyas to user's designated output path (or default '.eyas-dist/')
	userLog(`Creating executable(s)...`);
	userLog(``);

	// Build the executables
	const built = await builder.build({
		config: {
			appId: `com.cycosoft.eyas`,
			productName: `Eyas`,
			// eslint-disable-next-line quotes
			artifactName: '${productName}.${ext}', // This is not parsed in JS context
			copyright: `Copyright © 2023 Cycosoft, LLC`,
			asarUnpack: [`resources/**`],
			compression: `normal`, // normal, maximum, store
			directories: {
				output: paths.eyasDist,
				app: paths.eyasBuild
			},
			removePackageScripts: true,
			removePackageKeywords: true,
			mac: {
				target: `dmg`
			},
			win: {
				target: `portable`
			}
		}
	});

	// delete the build folder
	userLog(``);
	userLog(`Removing build directory...`);
	await fs.remove(paths.eyasBuild);

	// let the user know where the output is
	userLog(`Output created at: ${built?.length && built[0]}`);

	// log the end of the process
	userLog(`Compilation complete!`);
}

// wrapper to differentiate user logs (allowed) from system logs (disallowed)
function userLog(string) {
	// setup
	const output = string ? `* ${string}` :``;

	// eslint-disable-next-line no-console
	console.log(output);
}