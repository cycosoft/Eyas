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
		enabled: false,
		label: `Preview`,
		description: `Launch Eyas with the current configuration`,
		command: `preview`,
		action: runCommand_preview
	},
	previewNew: {
		enabled: true,
		label: `Preview (New)`,
		description: `Launch Eyas with the current configuration`,
		command: `previewNew`,
		action: runCommand_previewNew
	},
	compile: {
		enabled: false,
		label: `Compile`,
		description: `Bundle and compile Eyas with the current configuration for deployment`,
		command: `compile`,
		action: runCommand_compile
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
const isProd = __dirname.includes(`node_modules`);
const consumerRoot = process.cwd();
const moduleRoot = isProd
	? path.join(consumerRoot, `node_modules`, `@cycosoft`, `eyas`)
	: consumerRoot;
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
	macRunnerSrc: path.join(roots.dist, `runners`, `eyas.dmg`),
	macRunnerDest: path.join(roots.eyasBuild, `eyas.dmg`),
	linuxRunnerSrc: path.join(roots.dist, `runners`, `eyas.AppImage`),
	linuxRunnerDest: path.join(roots.eyasBuild, `eyas.AppImage`)
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
	const addHours = require(`date-fns/addHours`);
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

// generate a zipped output for distribution
async function runCommand_bundle() {
	const fs = require(`fs-extra`);
	const archiver = require(`archiver`);

	// setup the platform output
	const modifiedConfig = getModifiedConfig();
	const platforms = [
		{ enabled: config.outputs.windows, ext: `exe`, runner: paths.eyasRunnerWinSrc, tag: `win` },
		{ enabled: config.outputs.mac, ext: `dmg`, runner: paths.macRunnerSrc, tag: `mac` },
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
		const archive = archiver(`zip`, { store: true });
		// const archive = archiver(`zip`, { zlib: { level: 9 } });

		// push content to the archive
		archive.pipe(output);

		// add the appropriate runner
		archive.file(platform.runner, { name: `eyas.${platform.ext}` });

		// add the updated config
		archive.append(modifiedConfig, { name: `.eyas.config.js` });

		// add the user's test
		archive.directory(path.join(consumerRoot, config.test.source), `test`);

		// close the archive
		archive.finalize();
	});
}

// creates a local preview of the consumers application
async function runCommand_previewNew() {
	userLog(`generating new preview...`);

	// create the build folder to prep for usage
	await createBuildFolder();
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

		const builtFiles = await builder.build({
			targets: targets.length ? builder.createTargets(targets) : null,
			config: {
				appId: `com.cycosoft.eyas`,
				productName: `Eyas`,
				// eslint-disable-next-line quotes
				artifactName: `${artifactName}` + '.${ext}',
				copyright: `Copyright © 2023 Cycosoft, LLC`,
				asarUnpack: [`resources/**`],
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

		// wrap the executables in a zip file
		const archiver = require(`archiver`);
		let completedZipCount = 0;
		builtFiles.forEach(file => {
			// skip if the file is a blockmap
			if(file.endsWith(`.blockmap`)) {
				completedZipCount++;
				return;
			}

			// if the file is .AppImage, do not archive but let the user know it was created
			if(file.endsWith(`.AppImage`)) {
				completedZipCount++;
				userLog(`🎉 File created -> ${file}`);
				return;
			}

			// create the zip file
			const output = fs.createWriteStream(`${file}.zip`);
			output.on(`close`, () => {
				completedZipCount++;
				userLog(`🎉 File created -> ${file}.zip`);

				if(completedZipCount === builtFiles.length) {
					performCleanup();
				}
			});
			const archive = archiver(`zip`, { store: true });
			archive.pipe(output);
			const filename = file.split(`\\`).pop();
			archive.file(file, { name: filename });
			archive.finalize();
		});

		async function performCleanup() {
			// delete directories in the build output
			// delete files that aren't .zip, .AppImage
			userLog(`Performing cleanup...`);
			const files = await fs.readdir(paths.dist);
			for(const file of files) {
				// skip file if it's in the skip list
				let shouldSkip = false;
				const skipList = [`.zip`, `.AppImage`];
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
	}
}

// wrapper to differentiate user logs (allowed) from system logs (disallowed)
function userLog(string) {
	// setup
	const output = string ? `* ${string}` :``;

	// eslint-disable-next-line no-console
	console.log(output);
}