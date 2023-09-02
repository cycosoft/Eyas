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
	const eyasPath = path.join(process.cwd(), `.eyas-preview`, `index.js`);

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
	const builder = require(`electron-builder`);
	const { exec } = require(`pkg`);
	const { api } = require(`@electron-forge/core`);

	// setup
	const isProd = __dirname.includes(`node_modules`);
	const consumerRoot = process.cwd();
	const eyasRoot = isProd
		? path.join(consumerRoot, `node_modules`, `@cycosoft`, `eyas`)
		: consumerRoot;
	const names = {
		eyasPreview: `.eyas-preview`,
		eyasDist: `.eyas-dist`,
		eyasAssets: `assets`,
		eyasPackage: `package.json`,
		userConfig: `.eyasrc.js`,
		userSource: `user`
	};
	const paths = {
		eyasPreview: path.join(consumerRoot, names.eyasPreview),
		eyasDist: path.join(consumerRoot, names.eyasDist),
		assetsFrom: path.join(eyasRoot, names.eyasAssets),
		assetsTo: path.join(consumerRoot, names.eyasPreview, names.eyasAssets),
		eyasRunnerSource: path.join(eyasRoot, `dist`, `main`),
		eyasRunner: path.join(consumerRoot, names.eyasPreview, `index.js`),
		userSourceTo: path.join(consumerRoot, names.eyasPreview, names.userSource),
		eyasPackageJsonFrom: path.join(eyasRoot, `dist`, names.eyasPackage),
		eyasPackageJsonTo: path.join(consumerRoot, names.eyasPreview, names.eyasPackage),
		userConfigFrom: path.join(consumerRoot, names.userConfig),
		userConfigTo: path.join(consumerRoot, names.eyasPreview, names.userConfig)
	};

	// log the start of the process
	userLog(``);

	// delete any existing build folders
	userLog(`Resetting build space...`);
	await fs.remove(paths.eyasPreview);
	await fs.remove(paths.eyasDist);

	// create the temp folder to work in
	userLog(`Creating build directory...`);
	await fs.ensureDir(paths.eyasPreview);

	// copy dist/main/*.* to .eyas/
	userLog(`Copying Eyas runtime files...`);
	await fs.copy(paths.eyasRunnerSource, paths.eyasPreview);

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

	// create electron executable for the requested platforms with the files from .eyas to user's designated output path (or default '.eyas-dist/')
	userLog(`Creating executable(s)...`);
	userLog(``);
	// const appPaths = await packager({
	// 	appCopyright: `2023`,
	// 	appVersion: config.version,
	// 	buildVersion: process.env.npm_package_version,
	// 	dir: paths.eyasPreview,
	// 	executableName: `${config.appTitle} - ${config.buildVersion}`,
	// 	icon: path.join(paths.assetsFrom, `eyas-logo.png`),
	// 	name: `Eyas`,
	// 	out: names.eyasDist,
	// 	overwrite: true,
	// 	win32metadata: {
	// 		CompanyName: `Cycosoft, LLC`,
	// 		ProductName: `Eyas`
	// 	}
	// });

	const Platform = builder.Platform;

	const built = await builder.build({
		targets: [
			Platform.WINDOWS.createTarget()
			// Platform.MAC.createTarget(),
			// Platform.LINUX.createTarget()
		],
		config: {
			appId: `com.cycosoft.eyas`,
			productName: `Eyas`,
			artifactName: `eyas`,
			copyright: `Copyright © 2023 Cycosoft, LLC`,
			asarUnpack: [`resources/**`],
			compression: `maximum`, // normal, maximum, store
			directories: {
				output: paths.eyasDist,
				app: paths.eyasPreview
			},
			win: {
				target: `portable`
			},
			removePackageScripts: true,
			removePackageKeywords: true
		}
	});

	console.log({built});

	// await exec([
	// 	paths.eyasRunner,
	// 	`--config`, path.join(eyasRoot, `pkg.config.json`),
	// 	`--public`,
	// 	`--debug`,
	// 	`--out-path`, paths.eyasDist,
	// 	`--targets`, `latest-win`, // `latest-macos,latest-win,latest-linux`,
	// 	`--no-bytecode`,
	// 	// `--compress`, `Brotli`,
	// 	// `--compress`, `GZip`
	// ]);

	// const response = await api.package({
	// 	dir: paths.eyasRunner,
	// 	outDir: paths.eyasDist,
	// 	platform: [`darwin`, `mas`, `win32`, `linux`],
	// 	interactive: true
	// });

	// console.log(response);

	// let the user know where the output is
	userLog(`Output created at: ${paths.eyasDist}`);

	// delete the build folder
	// await fs.remove(paths.eyasPreview);

	// log the end of the process
	userLog(``);
}

// wrapper to differentiate user logs (allowed) from system logs (disallowed)
function userLog(string) {
	// setup
	const output = string ? `* ${string}` :``;

	// eslint-disable-next-line no-console
	console.log(output);
}