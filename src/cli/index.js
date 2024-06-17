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
	db: {
		enabled: true,
		label: `Generate an *.eyas file (smaller)`,
		description: `For use with installed versions of Eyas`,
		command: `db`,
		action: runCommand_db
	},
	bundle: {
		enabled: true,
		label: `Generate shareable zip of *.eyas file and runner (larger)`,
		description: `Does not need Eyas installed to run the test`,
		command: `bundle`,
		action: runCommand_bundle
	}
};

// setup
const path = require(`path`);
const isDev = process.env.NODE_ENV === `dev`;
const TEST_SOURCE = `data`;
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
	scripts: `scripts`,
	runner: `Start`
};
const paths = {
	dist: roots.eyasDist,
	build: roots.eyasBuild,
	configLoader: path.join(roots.dist, names.scripts, `get-config.js`),
	configDest: path.join(roots.eyasBuild, `.eyas.config.js`),
	testDest: path.join(roots.eyasBuild, TEST_SOURCE),
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
	eyasRunnerWinSrc: path.join(roots.dist, `runners`, `${names.runner}.exe`),
	eyasRunnerWinDest: path.join(roots.eyasBuild, `${names.runner}.exe`),
	macRunnerSrcZip: path.join(roots.dist, `runners`, `${names.runner}.app.zip`),
	macRunnerSrc: path.join(roots.dist, `runners`, `${names.runner}.app`),
	macRunnerDest: path.join(roots.eyasBuild, `${names.runner}.app`),
	linuxRunnerSrc: path.join(roots.dist, `runners`, `${names.runner}.AppImage`),
	linuxRunnerDest: path.join(roots.eyasBuild, `${names.runner}.AppImage`)
};

// set mode (disabled for now)
// actions.previewDev.enabled = isDev;

// load the user's config
const parseConfig = require(paths.configLoader);
const config = parseConfig();

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
		userLog(`Copying Eyas from ${paths.eyasRunnerWinSrc} to ${paths.eyasRunnerWinDest}...`);
		await fs.copy(paths.eyasRunnerWinSrc, paths.eyasRunnerWinDest);
	}

	// if on Mac, copy the eyas runner to the build folder
	if(process.platform === `darwin`){
		userLog(`Copying Eyas from ${paths.macRunnerSrc} to ${paths.macRunnerDest}...`);
		await fs.copy(paths.macRunnerSrc, paths.macRunnerDest);
	}

	// if on Linux, copy the eyas runner to the build folder
	if(process.platform === `linux`){
		userLog(`Copying Eyas from ${paths.linuxRunnerSrc} to ${paths.linuxRunnerDest}...`);
		await fs.copy(paths.linuxRunnerSrc, paths.linuxRunnerDest);
	}

	// copy the users source files to the build folder
	userLog(`Copying user test from ${config.source} to ${paths.testDest}...`);
	await fs.copy(config.source, paths.testDest);

	// write the config file
	const data = getModifiedConfig();
	await fs.outputFile(paths.configDest, data);
}

// the config that is bundled with the build
function getModifiedConfig() {
	// get the version from the module's package.json
	const { version } = require(paths.packageJsonModuleSrc);

	// create a new config file with the updated values in the build folder
	userLog(`Creating snapshot of config...`);
	const configCopy = JSON.parse(JSON.stringify(config));

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
		compiled: now,
		eyas: version
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

// generate a db output for distribution
async function runCommand_db() {
	const fs = require(`fs-extra`);
	const asar = require(`@electron/asar`);

	// get the test's config and prepare it for the build
	const modifiedConfig = getModifiedConfig();

	// reset the output directory
	await fs.emptyDir(roots.eyasDist);

	// put the user's test into an asar file with .eyas extension
	const artifactName = `${config.title} - ${config.version}.eyas`;
	const testSourceDirectory = config.source;
	const outputSourceDirectory = path.join(roots.eyasDist, `source`);
	const destinationAsarPath = path.join(roots.eyasDist, artifactName);

	// create a source/ directory in the output directory
	await fs.emptyDir(outputSourceDirectory);

	// copy the user's test to the output directory
	await fs.copy(testSourceDirectory, outputSourceDirectory);

	// save the modifiedConfig to the new source/ directory
	await fs.writeFile(path.join(outputSourceDirectory, `.eyas.config.js`), modifiedConfig);

	// create an asar file from the source/ directory and store it in the output directory
	await asar.createPackage(outputSourceDirectory, destinationAsarPath);

	// delete the source/ directory
	await fs.remove(outputSourceDirectory);

	userLog(``);
	userLog(`🎉 File created -> ${artifactName}`);
}

// generate a zipped output for distribution
async function runCommand_bundle() {
	const fs = require(`fs-extra`);
	const archiver = require(`archiver`);
	const extract = require(`extract-zip`);
	const asar = require(`@electron/asar`);

	// if the mac runner exists AND it wasn't already extracted
	if(fs.existsSync(paths.macRunnerSrcZip) && !fs.existsSync(paths.macRunnerSrc)) {
		// unzip the mac runner
		await extract(paths.macRunnerSrcZip, { dir: path.join(roots.dist, `runners`) });
	}

	// get the test's config and prepare it for the build
	const modifiedConfig = getModifiedConfig();

	// setup the platform output
	const platforms = [
		{ enabled: config.outputs.windows, ext: `exe`, runner: paths.eyasRunnerWinSrc, tag: `win` },
		{ enabled: config.outputs.mac, ext: `app`, runner: paths.macRunnerSrc, tag: `mac` },
		{ enabled: config.outputs.linux, ext: `AppImage`, runner: paths.linuxRunnerSrc, tag: `linux` }
	];

	// reset the output directory
	await fs.emptyDir(roots.eyasDist);

	// put the user's test into an asar file with .eyas extension
	const testSourceDirectory = config.source;
	const outputSourceDirectory = path.join(roots.eyasDist, `source`);
	const destinationAsarPath = path.join(roots.eyasDist, `${TEST_SOURCE}.eyas`);

	// create a source/ directory in the output directory
	await fs.emptyDir(outputSourceDirectory);

	// copy the user's test to the output directory
	await fs.copy(testSourceDirectory, outputSourceDirectory);

	// save the modifiedConfig to the new source/ directory
	await fs.writeFile(path.join(outputSourceDirectory, `.eyas.config.js`), modifiedConfig);

	// create an asar file from the source/ directory and store it in the output directory
	await asar.createPackage(outputSourceDirectory, destinationAsarPath);

	// create an array of promises for the archives
	const archivePromises = [];

	// loop through the platforms and create the zipped files if enabled
	platforms.forEach(platform => {
		// skip if the platform isn't enabled
		if(!platform.enabled) { return; }

		// start a promise for this platform archive process
		archivePromises.push(
			new Promise((resolve, reject) => {
				const artifactName = `${config.title} - ${config.version}.${platform.tag}.zip`;

				// create the zip file
				const output = fs.createWriteStream(path.join(roots.eyasDist, artifactName));

				// when the process has completed (Note: listener must be added before the archive is finalized)
				output.on(`close`, () => {
					// alert the user
					userLog(``);
					userLog(`🎉 File created -> ${artifactName}`);

					// resolve the promise
					resolve();
				});

				// prepare a new archive
				const archive = archiver(`zip`, { store: isDev, zlib: { level: 9 } });

				// push content to the archive
				archive.pipe(output);

				// add the appropriate runner
				if(platform.tag === `mac`) {
					archive.directory(platform.runner, `${names.runner}.${platform.ext}`);
				} else {
					archive.file(platform.runner, { name: `${names.runner}.${platform.ext}` });
				}

				// add the user's bundled asar test
				archive.file(destinationAsarPath, { name: `${TEST_SOURCE}.eyas` });

				// close the archive
				archive.finalize();
			})
		);
	});

	// when all promises have resolved
	Promise.all(archivePromises).then(async () => {
		// delete the source/ directory
		await fs.remove(outputSourceDirectory);

		// delete the asar file
		await fs.remove(destinationAsarPath);

		// alert the user
		userLog(``);
		userLog(`🎉 All files created!`);
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