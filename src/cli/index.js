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
	const moduleRoot = isProd
		? path.join(consumerRoot, `node_modules`, `@cycosoft`, `eyas`)
		: consumerRoot;
	const { cli: paths } = require(path.join(moduleRoot, `src`, `scripts`, `paths.js`));

	// give space for the start of the process
	userLog(``);

	// delete any existing build folders
	userLog(`Resetting build space...`);
	await fs.emptyDir(paths.build);

	// copy eyas source to build folder
	userLog(`Copying Eyas runtime files...`);
	await fs.copy(paths.eyasSrc, paths.eyasDest);

	// load AND run the user's config
	userLog(`Loading user config...`);
	const config = require(paths.getConfigScript);

	// cache the path to the users source files from the config for later
	const userProvidedSource = path.join(consumerRoot, config.test.source);

	// point the config test source to the new build folder location
	config.test.source = paths.testDest;

	// create a new config file with the updated values in the build folder
	userLog(`Creating snapshot of config...`);
	const data = `module.exports = ${JSON.stringify(config, null, 2)}`;
	await fs.outputFile(paths.configDest, data);

	// copy the users source files to the build folder as `test/`
	userLog(`Copying user source...`);
	await fs.copy(userProvidedSource, paths.testDest);

	// copy eyas assets to the build folder
	userLog(`Copying Eyas assets...`);
	await fs.copy(paths.eyasAssetsSrc, paths.eyasAssetsDest);

	// copy the package.json to the build folder
	userLog(`Copying package.json...`);
	await fs.copy(paths.packageJsonSrc, paths.packageJsonDest);

	return;

	// Install dependencies
	userLog(`Installing dependencies...`);
	child_process.execSync(`npm i`, { stdio: [0,1,2] });

	// reset path

	// create electron executable for the requested platforms with the files from .eyas to user's designated output path (or default '.eyas-dist/')
	userLog(`Creating executable(s)...`);
	userLog(``);

	// Build the executables
	await builder.build({
		config: {
			appId: `com.cycosoft.eyas`,
			productName: `Eyas`,
			// eslint-disable-next-line quotes
			artifactName: `${config.appTitle} - ${config.buildVersion}` + '.${ext}',
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
	userLog(`Output created at: ${paths.eyasDist}`);

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