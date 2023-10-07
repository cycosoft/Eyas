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
	macRunner: `eyas.command`,
	winRunner: `eyas.cmd`,
	winRunnerInstaller: `installModule.cmd`,
	winRunnerShortcut: `Start The App.lnk`,
	packageJsonCore: `package.json`,
	packageJsonInstaller: `package.installer.json`,
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
	packageJsonCoreSrc: path.join(roots.dist, `build-assets`, names.packageJsonCore),
	packageJsonInstallerSrc: path.join(roots.dist, `build-assets`, names.packageJsonInstaller),
	packageJsonDest: path.join(roots.eyasBuild, names.packageJson),
	macRunnerSrc: path.join(roots.dist, `build-assets`, names.macRunner),
	winRunnerSrc: path.join(roots.dist, `build-assets`, names.winRunner),
	winRunnerInstallerSrc: path.join(roots.dist, `build-assets`, names.winRunnerInstaller),
	winRunnerShortcutSrc: path.join(roots.dist, `build-assets`, names.winRunnerShortcut),
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
	const { version } = require(paths.packageJsonCoreSrc);

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

	// copy eyas source to build folder
	userLog(`Copying Eyas runtime files...`);
	await fs.copy(paths.eyasSrc, paths.eyasDest);
	await fs.copy(paths.scriptsSrc, paths.scriptsDest);
	await fs.copy(paths.eyasInterfaceSrc, paths.eyasInterfaceDest);
	await fs.copy(paths.eyasAssetsSrc, paths.eyasAssetsDest);

	// copy the users source files to the build folder
	userLog(`Copying test source...`);
	await fs.copy(path.join(consumerRoot, config.test.source), paths.testDest);

	// create a new config file with the updated values in the build folder
	userLog(`Creating snapshot of config...`);
	delete config.test.source; // isn't used past this point
	const data = `module.exports = ${JSON.stringify(config)}`;
	await fs.outputFile(paths.configDest, data);

	// generate meta data for the build
	const { execSync } = require(`child_process`);
	const now = new Date();
	const expires = addHours(now, config.outputs.expires);
	let gitBranch = ``, gitHash = ``, gitUser = ``;
	try { gitBranch = execSync(`git rev-parse --abbrev-ref HEAD`).toString().trim(); } catch (e) {/**/}
	try { gitHash = execSync(`git rev-parse --short HEAD`).toString().trim(); } catch (e) {/**/}
	try { gitUser = execSync(`git config user.name`).toString().trim(); } catch (e) {/**/}
	const metaData = {
		expires,
		gitBranch,
		gitHash,
		gitUser,
		compiled: now
	};
	await fs.outputFile(paths.metaDest, JSON.stringify(metaData));

	// let the user know when this build expires
	userLog(`Set build expirations to: ${expires.toLocaleString()}`);
}

// launch a preview of the consumers application
async function runCommand_preview(devMode = false) {
	const fs = require(`fs-extra`);
	const { spawn } = require(`child_process`);
	const electron = require(`electron`);

	// create the build folder to prep for usage
	await createBuildFolder();

	// copy the package.json to the build folder
	userLog(`Copying dependency manifest...`);
	await fs.copy(paths.packageJsonCoreSrc, paths.packageJsonDest);

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

	// Clear out the output directory
	userLog(`Prepare output directory...`);
	await fs.emptyDir(paths.dist);

	// set the name of the output files
	const artifactName = `${config.test.title} - ${config.test.version}`;

	// create the portable versions
	// NOTE: this must come first so installed dependencies aren't included
	if(config.outputs.node) {
		await build_portables();
	}

	// create the executable versions
	if(config.outputs.executable){
		await build_executables();
	}

	async function build_executables() {
		// copy the package.json to the build folder
		userLog();
		await fs.copy(paths.packageJsonCoreSrc, paths.packageJsonDest);

		// Install dependencies
		userLog(`Installing dependencies...`);
		child_process.execSync(`npm i`, { cwd: paths.build });

		userLog(`Creating "executable" distributable(s)...`);
		userLog();

		// Build the executables
		const targets = [];
		if(config.outputs.windows) { targets.push(builder.Platform.WINDOWS); }
		if(config.outputs.mac) { targets.push(builder.Platform.MAC); }
		if(config.outputs.linux) { targets.push(builder.Platform.LINUX); }
		// if(config.outputs.executable) { targets.push(builder.Platform.current()); }

		const builtFiles = await builder.build({
			targets: targets.length ? builder.createTargets(targets) : null,
			config: {
				appId: `com.cycosoft.eyas`,
				productName: `Eyas`,
				// eslint-disable-next-line quotes
				artifactName: `${artifactName}` + '.${ext}',
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
		!config.outputs.zip && builtFiles.forEach(file => userLog(`File created -> ${file}`));

		// if the config says to create a zip file
		const archiver = require(`archiver`);
		config.outputs.zip && builtFiles.forEach(file => {
			// if the file is .AppImage, skip the loop
			if(file.endsWith(`.AppImage`)) { return; }

			// create the zip file
			const output = fs.createWriteStream(`${file}.zip`);
			const archive = archiver(`zip`, { store: true });
			archive.pipe(output);
			const filename = file.split(`\\`).pop();
			archive.file(file, { name: filename });
			archive.finalize();

			// remove the included file
			fs.remove(file);

			userLog(`File created -> ${file}.zip`);
		});

		// delete directories in the build output
		// delete files that aren't .zip, .dmg, .exe, .AppImage
		userLog(`Performing cleanup...`);
		const files = await fs.readdir(paths.dist);
		for(const file of files) {
			// skip file if it's in the skip list
			let shouldSkip = false;
			const skipList = [`.zip`, `.dmg`, `.exe`, `.AppImage`];
			skipList.forEach(skip => {
				if(file.endsWith(skip)) { shouldSkip = true; }
			});

			// exit this loop if the file should be skipped
			if(shouldSkip) { continue; }

			// get the full path to the file
			const filePath = path.join(paths.dist, file);

			// if it's a directory, delete it
			if((await fs.stat(filePath)).isDirectory()) {
				await fs.remove(filePath);
				continue;
			}

			// delete the file
			await fs.remove(filePath);
		}

		// log the end of the process
		userLog(`Executable compilation complete!`);
		userLog();
	}

	async function build_portables() {
		// overwrite the installer manifest with the runner manifest
		userLog();
		userLog(`Copying dependency manifest...`);
		await fs.copy(paths.packageJsonCoreSrc, paths.packageJsonDest);

		// create the node runner version
		userLog(`Creating "portable" distributable(s)...`);
		const archiver = require(`archiver`);
		const output = fs.createWriteStream(paths.dist + `/${artifactName}.zip`);
		const archive = archiver(`zip`, { zlib: 9 });
		output.on(`close`, () => {
			userLog(`Portable compilation complete!`);
			userLog();
		});
		archive.pipe(output);

		// add common files
		archive.directory(paths.build, false);

		// add mac/win files
		archive.file(paths.macRunnerSrc, { name: names.macRunner });
		archive.file(paths.winRunnerSrc, { name: names.winRunner });
		archive.file(paths.winRunnerInstallerSrc, { name: names.winRunnerInstaller });
		archive.file(paths.winRunnerShortcutSrc, { name: names.winRunnerShortcut });

		// complete the archive
		archive.finalize();
	}
}

// wrapper to differentiate user logs (allowed) from system logs (disallowed)
function userLog(string) {
	// setup
	const output = string ? `* ${string}` :``;

	// eslint-disable-next-line no-console
	console.log(output);
}