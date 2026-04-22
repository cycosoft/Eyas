#!/usr/bin/env node

import dotenv from "dotenv";
dotenv.config({ path: [`.env.local`, `.env`] });
import path from "path";
import fs from "fs-extra";
import type { Platform } from "electron-builder";
import builder from "electron-builder";
import { exec } from "child_process";
import { getElectronBuilderConfig } from "./electron-builder-config.js";
import type { SourcePath, IsActive } from "@registry/primitives.js";

/**
 * Compiles the runners for the project.
 * @returns {Promise<void>}
 */
export async function compileRunners(): Promise<void> {
	const isDev = process.env.NODE_ENV === `dev`;
	const isInstaller = process.env.PUBLISH_TYPE === `installer`;
	const isMac = process.platform === `darwin`;
	const isWin = process.platform === `win32`;
	const consumerRoot = process.cwd();
	const runnersRoot = path.join(consumerRoot, `.runners`);
	const distRoot = path.join(consumerRoot, `dist`);

	const paths = getPaths(consumerRoot);
	const targets = getBuildTargets(isWin, isMac);
	const runnerName = `Eyas${isInstaller ? `Installer` : ``}`;

	const config = getElectronBuilderConfig({
		isDev,
		isInstaller,
		isMac,
		isWin,
		paths,
		runnerName,
		appleTeamId: process.env.APPLE_TEAM_ID || ``,
		buildRoot: consumerRoot,
		runnersRoot,
		provisioningProfile: process.env.PROVISIONING_PROFILE_PATH || ``
	});

	const builtFiles = await builder.build({
		targets: targets.length ? builder.createTargets(targets) : undefined,
		config,
		publish: isInstaller ? `always` : `never`
	});

	await copyExecutables(builtFiles, distRoot);
	maybeOpenRunnersFolder(runnersRoot, isWin);
}

type BuildPaths = {
	icon: SourcePath;
	iconDbWin: SourcePath;
	iconDbMac: SourcePath;
	codesignWin: SourcePath;
}

/**
 * Gets the paths for the project.
 * @param {string} consumerRoot The root of the consumer project.
 * @returns {BuildPaths} The paths for the project.
 */
function getPaths(consumerRoot: SourcePath): BuildPaths {
	return {
		icon: path.join(consumerRoot, `src`, `eyas-assets`, `eyas-logo.png`),
		iconDbWin: path.join(consumerRoot, `src`, `eyas-assets`, `eyas-db.ico`),
		iconDbMac: path.join(consumerRoot, `src`, `eyas-assets`, `eyas-db.icns`),
		codesignWin: path.join(consumerRoot, `src`, `scripts`, `codesign-win.js`)
	};
}

/**
 * Gets the build targets for the project.
 * @param {boolean} isWin Whether the platform is Windows.
 * @param {boolean} isMac Whether the platform is Mac.
 * @returns {Platform[]} The build targets for the project.
 */
function getBuildTargets(isWin: IsActive, isMac: IsActive): Platform[] {
	const targets: Platform[] = [];
	if (isWin) { targets.push(builder.Platform.WINDOWS); }
	if (isMac) { targets.push(builder.Platform.MAC); }
	return targets;
}

/**
 * Copies the built executables to the dist folder.
 * @param {string[]} builtFiles The files that were built.
 * @param {string} distRoot The root of the dist folder.
 * @returns {Promise<void>}
 */
async function copyExecutables(builtFiles: SourcePath[], distRoot: SourcePath): Promise<void> {
	for (const file of builtFiles) {
		// skip anything not an exe
		if (!file.endsWith(`.exe`)) { continue; }

		const dest = path.join(distRoot, `runners`, `Start.exe`);
		console.log(`copying ${file} to ${dest}`);
		await fs.copy(file, dest);
	}
}

/**
 * Opens the output folder if requested.
 * @param {string} runnersRoot The root of the runners folder.
 * @param {boolean} isWin Whether the platform is Windows.
 * @returns {void}
 */
function maybeOpenRunnersFolder(runnersRoot: SourcePath, isWin: IsActive): void {
	if (process.env.EYAS_OPEN_RUNNERS !== `true`) { return; }

	const command = isWin ? `explorer "${runnersRoot}"` : `open "${runnersRoot}"`;
	exec(command);
}

// Entry Point
if (!process.env.VITEST) {
	compileRunners();
}
