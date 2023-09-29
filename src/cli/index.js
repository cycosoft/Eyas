#!/usr/bin/env node

/* global process, __dirname */

'use strict';

// define the actions for the CLI
const actions = {
	config: {
		enabled: false,
		label: `Configure`,
		description: `Launch the Eyas configuration editor`,
		command: `config`,
		action: runCommand_config
	},
	previewDev: {
		enabled: false,
		label: `Preview (dev mode)`,
		description: `Launch Eyas in development mode`,
		command: `previewDev`,
		action: () => runCommand_preview(true)
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

// setup
const path = require(`path`);
const isProd = __dirname.includes(`node_modules`);
const consumerRoot = process.cwd();
const moduleRoot = isProd
	? path.join(consumerRoot, `node_modules`, `@cycosoft`, `eyas`)
	: consumerRoot;
const roots = require(path.join(moduleRoot, `dist`, `scripts`, `get-roots.js`));
const names = {
	packageJson: `package.json`,
	eyasAssets: `eyas-assets`,
	eyasInterface: `eyas-interface`,
	scripts: `scripts`
};
const paths = {
	dist: roots.eyasDist,
	build: roots.eyasBuild,
	configLoader: path.join(roots.dist, names.scripts, `get-config.js`),
	configDest: path.join(roots.eyasBuild, `.eyas.config.js`),
	metaDest: path.join(roots.eyasBuild, `.eyas.meta.json`),
	eyasApp: path.join(roots.eyasBuild, `index.js`),
	eyasAssetsSrc: path.join(roots.dist, names.eyasAssets),
	eyasAssetsDest: path.join(roots.eyasBuild, names.eyasAssets),
	eyasInterfaceSrc: path.join(roots.dist, names.eyasInterface),
	eyasInterfaceDest: path.join(roots.eyasBuild, names.eyasInterface),
	eyasSrc: path.join(roots.dist, `eyas-core`),
	eyasDest: roots.eyasBuild,
	packageJsonSrc: path.join(roots.dist, `build-assets`, names.packageJson),
	packageJsonDest: path.join(roots.eyasBuild, names.packageJson),
	scriptsSrc: path.join(roots.dist, names.scripts),
	scriptsDest: path.join(roots.eyasBuild, names.scripts),
	testDest: path.join(roots.eyasBuild, `test`),
	icon: path.join(roots.eyasBuild, `eyas-assets`, `eyas-logo.png`)
};

// set mode
actions.previewDev.enabled = !isProd;

// load the user's config
const config = require(paths.configLoader);

// Entry Point
(async () => {
	// import dependencies
	const { program: cli } = require(`commander`);

	// define the commands for the CLI
	defineCommands(cli);

	// if arguments were passed to the script
	if(process.argv.slice(2).length) {
		// parse the arguments and run the commands
		cli.parse();
	}else{
		// fall back to asking the user how to proceed
		askUser();
	}
})();

// ask the user what they want to do
function askUser() {
	// import
	const inquirer = require(`inquirer`);

	// add a space from the previous output
	userLog();

	// ask the user what they want to do
	inquirer
		.prompt([
			{
				type: `list`,
				name: `action`,
				message: `What would you like to do?`,
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
	// get the version from the module's package.json
	const { version } = require(paths.packageJsonSrc);

	// define the details of the CLI
	cli
		.name(`eyas`)
		.description(`A serverless testing container for web applications`)
		.version(version);

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
async function runCommand_config() {
	// eslint-disable-next-line no-console
	console.log(`config command disabled`);
}

// runs all the steps to create the build folder
async function createBuildFolder() {
	// imports
	const fs = require(`fs-extra`);
	const addHours = require(`date-fns/addHours`);


	// give space for the start of the process
	userLog();

	// delete any existing build folders
	userLog(`Resetting build space...`);
	await fs.emptyDir(paths.build);

	// copy the package.json to the build folder
	userLog(`Copying build assets...`);
	await fs.copy(paths.packageJsonSrc, paths.packageJsonDest);

	// copy eyas source to build folder
	userLog(`Copying Eyas runtime files...`);
	await fs.copy(paths.eyasSrc, paths.eyasDest);
	await fs.copy(paths.scriptsSrc, paths.scriptsDest);
	await fs.copy(paths.eyasInterfaceSrc, paths.eyasInterfaceDest);

	// copy the users source files to the build folder
	userLog(`Copying test source...`);
	await fs.copy(path.join(consumerRoot, config.test.source), paths.testDest);

	// create a new config file with the updated values in the build folder
	userLog(`Creating snapshot of config...`);
	delete config.test.source; // isn't used past this point
	const data = `module.exports = ${JSON.stringify(config)}`;
	await fs.outputFile(paths.configDest, data);

	// copy eyas assets to the build folder
	userLog(`Copying Eyas assets...`);
	await fs.copy(paths.eyasAssetsSrc, paths.eyasAssetsDest);

	// generate meta data for the build
	userLog(`Generating meta data...`);
	const expiration = addHours(new Date(), config.outputs.expires);
	const metaData = { expiration };
	await fs.outputFile(paths.metaDest, JSON.stringify(metaData));

	// let the user know when this build expires
	userLog(`  > Build expires ${expiration.toLocaleString()}`);
}

// launch a preview of the consumers application
async function runCommand_preview(devMode = false) {
	const { spawn } = require(`child_process`);
	const electron = require(`electron`);

	// create the build folder to prep for usage
	await createBuildFolder();

	// Alert that preview is starting
	userLog(`Launching preview...`);

	// run the app
	const command = [paths.eyasApp];
	if(devMode) { command.push(`--dev`); }
	spawn(electron, command, {
		detached: true,
		stdio: `ignore`,
		windowsHide: false,
		cwd: consumerRoot
	}).unref(); // allow the command line to continue running

	// log the end of the process
	userLog(`Preview launched!`);
	userLog();
}

// compile the consumers application for deployment
async function runCommand_compile() {
	// imports
	const fs = require(`fs-extra`);
	const builder = require(`electron-builder`);
	const child_process = require(`child_process`);

	// create the build folder to prep for usage
	await createBuildFolder();

	// Install dependencies
	userLog(`Installing dependencies...`);
	child_process.execSync(`npm i`, { cwd: paths.build });

	// Clear out the output directory
	userLog(`Resetting output directory...`);
	await fs.emptyDir(paths.dist);

	// Log that compilation is starting
	userLog(`Creating executable(s)...`);
	userLog();

	// Build the executables
	const targets = [];
	if(config.outputs.windows) { targets.push(builder.Platform.WINDOWS); }
	if(config.outputs.mac) { targets.push(builder.Platform.MAC); }
	if(config.outputs.linux) { targets.push(builder.Platform.LINUX); }

	await builder.build({
		targets: targets.length ? builder.createTargets(targets) : null,
		config: {
			appId: `com.cycosoft.eyas`,
			productName: `Eyas`,
			// eslint-disable-next-line quotes
			artifactName: `${config.test.title} - ${config.test.version}` + '.${ext}',
			copyright: `Copyright © 2023 Cycosoft, LLC`,
			asarUnpack: [`resources/**`],
			compression: config.outputs.compression,
			directories: {
				app: paths.build,
				output: paths.dist
			},
			removePackageScripts: true,
			removePackageKeywords: true,
			mac: {
				target: `dmg`,
				icon: paths.icon
				// identity: `undefined` // disable code signing
			},
			win: {
				target: `portable`,
				icon: paths.icon
			},
			linux: {
				target: `AppImage`,
				icon: paths.icon,
				category: `Utility`
			}
		}
	});

	// let the user know where the output is
	userLog();
	userLog(`Files created at: ${paths.dist}`);

	// delete the build folder
	userLog(`Removing build directory...`);
	await fs.remove(paths.build);

	// log the end of the process
	userLog(`Compilation complete!`);
	userLog();
}

// wrapper to differentiate user logs (allowed) from system logs (disallowed)
function userLog(string) {
	// setup
	const output = string ? `* ${string}` :``;

	// eslint-disable-next-line no-console
	console.log(output);
}