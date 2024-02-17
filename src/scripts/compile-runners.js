#!/usr/bin/env node

/* global process, __dirname */

'use strict';

const path = require(`path`);
const isProd = __dirname.includes(`node_modules`);
const consumerRoot = process.cwd();
const moduleRoot = isProd
	? path.join(consumerRoot, `node_modules`, `@cycosoft`, `eyas`)
	: consumerRoot;
const roots = require(path.join(moduleRoot, `.build`, `scripts`, `get-roots.js`));
const names = {
	linuxRunner: `linuxRunner.sh`,
	macRunner: `macRunner.command`,
	winRunner: `winRunner.cmd`,
	winDownloader: `getDependency.cmd`,
	packageJsonCore: `package.json`,
	packageJson: `package.json`,
	eyasAssets: `eyas-assets`,
	eyasInterface: `eyas-interface`,
	scripts: `scripts`
};
const paths = {
	dist: roots.eyasDist,
	build: roots.eyasBuild,
	configLoader: path.join(roots.moduleBuild, names.scripts, `get-config.js`),
	configDest: path.join(roots.eyasBuild, `.eyas.config.js`),
	eyasApp: path.join(roots.eyasBuild, `index.js`),
	eyasAssetsSrc: path.join(roots.dist, names.eyasAssets),
	eyasAssetsDest: path.join(roots.eyasBuild, names.eyasAssets),
	eyasInterfaceSrc: path.join(roots.dist, names.eyasInterface),
	eyasInterfaceDest: path.join(roots.eyasBuild, names.eyasInterface),
	eyasSrc: path.join(roots.dist, `eyas-core`),
	eyasDest: roots.eyasBuild,
	packageJsonCoreSrc: path.join(roots.dist, `build-assets`, names.packageJsonCore),
	packageJsonDest: path.join(roots.eyasBuild, names.packageJson),
	linuxRunnerSrc: path.join(roots.dist, `build-assets`, names.linuxRunner),
	macRunnerSrc: path.join(roots.dist, `build-assets`, names.macRunner),
	winRunnerSrc: path.join(roots.dist, `build-assets`, names.winRunner),
	winRunnerInstallerSrc: path.join(roots.dist, `build-assets`, names.winDownloader),
	scriptsSrc: path.join(roots.dist, names.scripts),
	scriptsDest: path.join(roots.eyasBuild, names.scripts),
	testDest: path.join(roots.eyasBuild, `test`),
	icon: path.join(roots.moduleBuild, `eyas-assets`, `eyas-logo.png`)
};

// Entry Point
(async () => {
	const fs = require(`fs-extra`);
	const builder = require(`electron-builder`);

	// load the user's config
	// console.log(`Loading configuration...`);
	// const config = require(paths.configLoader);

	// create the build folder to prep for usage
	// console.log(`Creating build folder...`);
	// await createBuildFolder();

	// console.log(`Empty directory...`);
	// await fs.emptyDir(paths.dist);

	// copy the package.json to the build folder
	// userLog(`Copying dependency manifest...`);
	// console.log(`Copying package.json...`);
	// await fs.copy(paths.packageJsonCoreSrc, paths.packageJsonDest);

	// Determine the executables to build
	const targets = [];
	// if(config.outputs.windows) { targets.push(builder.Platform.WINDOWS); }
	// if(config.outputs.mac) { targets.push(builder.Platform.MAC); }
	// if(config.outputs.linux) { targets.push(builder.Platform.LINUX); }

	// set the name of the output files
	const runnerName = `eyas`;
	// const zipName = `${config.test.title} - ${config.test.version}`;

	const builtFiles = await builder.build({
		targets: targets.length ? builder.createTargets(targets) : null,
		config: {
			appId: `com.cycosoft.eyas`,
			productName: `Eyas`,
			// eslint-disable-next-line quotes
			artifactName: runnerName + '.${ext}',
			copyright: `Copyright © 2023 Cycosoft, LLC`,
			asarUnpack: [`resources/**`],
			directories: {
				app: roots.moduleBuild,
				output: roots.runners
			},
			// compression: `store`, // debug purposes
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

	// copy just the final executables to the dist folder
	builtFiles.forEach(file => {
		const dest = path.join(roots.dist, `runners`, path.basename(file));
		console.log(`copying ${file} to ${dest}`);
		fs.copy(file, dest);
	});

	// cleanup
	console.log(`Cleaning up...`);
	await fs.remove(roots.moduleBuild);
	await fs.remove(roots.runners);

	async function createBuildFolder() {
		// imports
		const fs = require(`fs-extra`);
		// const addHours = require(`date-fns/addHours`);

		// give space for the start of the process
		// userLog();

		// delete any existing build folders
		// userLog(`Resetting build space...`);
		await fs.emptyDir(paths.build);

		// copy eyas source to build folder
		// userLog(`Copying Eyas runtime files...`);
		await fs.copy(paths.eyasSrc, paths.eyasDest);
		await fs.copy(paths.scriptsSrc, paths.scriptsDest);
		await fs.copy(paths.eyasInterfaceSrc, paths.eyasInterfaceDest);
		await fs.copy(paths.eyasAssetsSrc, paths.eyasAssetsDest);

		// copy the users source files to the build folder
		// userLog(`Copying test source...`);
		// await fs.copy(path.join(consumerRoot, config.test.source), paths.testDest);

		// create a new config file with the updated values in the build folder
		// userLog(`Creating snapshot of config...`);
		// delete config.test.source; // isn't used past this point

		// generate meta data for the build
		// const { execSync } = require(`child_process`);
		// const now = new Date();
		// const expires = addHours(now, config.outputs.expires);
		// let gitBranch = ``, gitHash = ``, gitUser = ``;
		// try { gitBranch = execSync(`git rev-parse --abbrev-ref HEAD`).toString().trim(); } catch (e) {/**/}
		// try { gitHash = execSync(`git rev-parse --short HEAD`).toString().trim(); } catch (e) {/**/}
		// try { gitUser = execSync(`git config user.name`).toString().trim(); } catch (e) {/**/}
		// config.meta = {
		// 	expires,
		// 	gitBranch,
		// 	gitHash,
		// 	gitUser,
		// 	compiled: now
		// };

		// write the config file
		// const data = `module.exports = ${JSON.stringify(config)}`;
		// await fs.outputFile(paths.configDest, data);

		// let the user know when this build expires
		// userLog(`Set build expirations to: ${expires.toLocaleString()}`);
	}
})();
