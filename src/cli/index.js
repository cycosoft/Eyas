#!/usr/bin/env node

/* global process */

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
		enabled: false,
		label: `Preview`,
		description: `Launch Eyas with the current configuration`,
		command: `preview`,
		action: runCommand_preview
	},
	bundle: {
		enabled: true,
		label: `Bundle`,
		description: `Generate a zipped output for distribution`,
		command: `bundle`,
		action: runCommand_bundle
	}
};

// setup
const path = require(`path`);
const isDev = process.env.NODE_ENV === `dev`;
const consumerRoot = process.cwd();
const moduleRoot = isDev
	? consumerRoot
	: path.join(consumerRoot, `node_modules`, `@cycosoft`, `eyas`);
const roots = require(path.join(moduleRoot, `dist`, `scripts`, `get-roots.js`));
const names = {
	packageJsonCore: `package.json`,
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
	eyasApp: path.join(roots.eyasBuild, `index.js`),
	eyasAssetsSrc: path.join(roots.dist, names.eyasAssets),
	eyasAssetsDest: path.join(roots.eyasBuild, names.eyasAssets),
	eyasInterfaceSrc: path.join(roots.dist, names.eyasInterface),
	eyasInterfaceDest: path.join(roots.eyasBuild, names.eyasInterface),
	eyasSrc: path.join(roots.dist, `eyas-core`),
	eyasDest: roots.eyasBuild,
	packageJsonModuleSrc: path.join(roots.module, names.packageJson),
	packageJsonCoreSrc: path.join(roots.dist, `build-assets`, names.packageJsonCore),
	packageJsonDest: path.join(roots.eyasBuild, names.packageJson),
	scriptsSrc: path.join(roots.dist, names.scripts),
	scriptsDest: path.join(roots.eyasBuild, names.scripts),
	testDest: path.join(roots.eyasBuild, `test`),
	icon: path.join(roots.eyasBuild, `eyas-assets`, `eyas-logo.png`),
	eyasRunnerWinSrc: path.join(roots.dist, `runners`, `eyas.exe`),
	eyasRunnerWinDest: path.join(roots.eyasBuild, `eyas.exe`),
	macRunnerSrc: path.join(roots.dist, `runners`, `eyas.app`),
	macRunnerDest: path.join(roots.eyasBuild, `eyas.app`),
	linuxRunnerSrc: path.join(roots.dist, `runners`, `eyas.AppImage`),
	linuxRunnerDest: path.join(roots.eyasBuild, `eyas.AppImage`)
};

// set mode
actions.previewDev.enabled = isDev;

// load the user's config
const config = require(paths.configLoader);

// Entry Point
(async () => {
	// ERROR CHECK: capture times when the user's platform isn't supported
	if (!config.outputs.windows && !config.outputs.mac && !config.outputs.linux) {
		userWarn(`⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️`);
		userWarn(`⚠️                                      ⚠️`);
		userWarn(`⚠️    No supported platforms enabled    ⚠️`);
		userWarn(`⚠️                                      ⚠️`);
		userWarn(`⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️  ⚠️`);

		// exit the function
		return;
	}

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
	const { version } = require(paths.packageJsonModuleSrc);

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

	// give space for the start of the process
	userLog();

	// delete any existing build folders
	userLog(`Resetting build space...`);
	await fs.emptyDir(paths.build);

	// if on Windows, copy the eyas runner to the build folder
	if(process.platform === `win32`){
		await fs.copy(paths.eyasRunnerWinSrc, paths.eyasRunnerWinDest);
	}

	// if on Mac, copy the eyas runner to the build folder
	if(process.platform === `darwin`){
		await fs.copy(paths.macRunnerSrc, paths.macRunnerDest);
	}

	// if on Linux, copy the eyas runner to the build folder
	if(process.platform === `linux`){
		await fs.copy(paths.linuxRunnerSrc, paths.linuxRunnerDest);
	}

	// copy the users source files to the build folder
	userLog(`Copying test source...`);
	await fs.copy(path.join(consumerRoot, config.test.source), paths.testDest);

	// write the config file
	const data = getModifiedConfig();
	await fs.outputFile(paths.configDest, data);
}

function getModifiedConfig() {
	// create a new config file with the updated values in the build folder
	userLog(`Creating snapshot of config...`);
	const configCopy = JSON.parse(JSON.stringify(config));
	delete configCopy.test.source; // isn't used past this point

	// generate meta data for the build
	const { execSync } = require(`child_process`);
	const { addHours } = require(`date-fns/addHours`);
	const now = new Date();
	const expires = addHours(now, configCopy.outputs.expires);
	let gitBranch = ``, gitHash = ``, gitUser = ``;
	try { gitBranch = execSync(`git rev-parse --abbrev-ref HEAD`).toString().trim(); } catch (e) {/**/}
	try { gitHash = execSync(`git rev-parse --short HEAD`).toString().trim(); } catch (e) {/**/}
	try { gitUser = execSync(`git config user.name`).toString().trim(); } catch (e) {/**/}
	configCopy.meta = {
		expires,
		gitBranch,
		gitHash,
		gitUser,
		compiled: now
	};

	// wrap the config in a module export
	const data = `module.exports = ${JSON.stringify(configCopy)}`;

	// let the user know when this build expires
	userLog(`Set build expirations to: ${expires.toLocaleString()}`);

	// return the updated config data
	return data;
}

// launch a preview of the consumers application
async function runCommand_preview(devMode = false) {
	const { spawn } = require(`child_process`);

	// create the build folder to prep for usage
	await createBuildFolder();

	// Alert that preview is starting
	userLog(`Launching preview...`);

	// run the app
	if(process.platform === `win32`){
		const command = [];
		if(devMode) { command.push(`--dev`); }
		spawn(paths.eyasRunnerWinDest, command, {
			detached: true,
			stdio: `ignore`,
			windowsHide: false,
			cwd: consumerRoot
		}).unref(); // allow the command line to continue running
	} else {
		const command = [paths.macRunnerDest];
		// if(devMode) { command.push(`--dev`); }
		spawn(`open`, command, {
			detached: true,
			stdio: `ignore`,
			windowsHide: false,
			cwd: consumerRoot
		}).unref(); // allow the command line to continue running

	}

	// log the end of the process
	userLog(`Preview launched!`);
	userLog();
}

// generate a zipped output for distribution
async function runCommand_bundle() {
	const fs = require(`fs-extra`);
	const archiver = require(`archiver`);

	// setup the platform output
	const modifiedConfig = getModifiedConfig();
	const platforms = [
		{ enabled: config.outputs.windows, ext: `exe`, runner: paths.eyasRunnerWinSrc, tag: `win` },
		{ enabled: config.outputs.mac, ext: `app`, runner: paths.macRunnerSrc, tag: `mac` },
		{ enabled: config.outputs.linux, ext: `AppImage`, runner: paths.linuxRunnerSrc, tag: `linux` }
	];

	// reset the output directory
	await fs.emptyDir(roots.eyasDist);

	// loop through the platforms and create the zipped files if enabled
	platforms.forEach(platform => {
		// skip if the platform isn't enabled
		if(!platform.enabled) { return; }

		const artifactName = `${config.test.title} - ${config.test.version}.${platform.tag}.zip`;

		// create the zip file
		const output = fs.createWriteStream(path.join(roots.eyasDist, artifactName));

		// when the process has completed (Note: listener must be added before the archive is finalized)
		output.on(`close`, () => {
			// alert the user
			userLog(`🎉 File created -> ${artifactName}`);
		});

		// prepare a new archive
		const archive = archiver(`zip`, { store: isDev, zlib: { level: 9 } });

		// push content to the archive
		archive.pipe(output);

		// add the appropriate runner
		archive.file(platform.runner, { name: `${config.test.title}.${platform.ext}` });

		// add the updated config
		archive.append(modifiedConfig, { name: `.eyas.config.js` });

		// add the user's test
		archive.directory(path.join(consumerRoot, config.test.source), `test`);

		// close the archive
		archive.finalize();
	});
}

// wrapper to differentiate user logs (allowed) from system logs (disallowed)
function userLog(string) {
	// setup
	const output = string ? `* ${string}` :``;

	// eslint-disable-next-line no-console
	console.log(output);
}

// wrapper to avoid linting errors
function userWarn(input) {
	// eslint-disable-next-line no-console
	console.warn(input);
}