import type { Configuration } from "electron-builder";
import type { SourcePath, IsActive, LabelString } from "@registry/primitives.js";

type BuildPaths = {
	icon: SourcePath;
	iconDbWin: SourcePath;
	iconDbMac: SourcePath;
	codesignWin: SourcePath;
}

type BuildOptions = {
	isDev: IsActive;
	isInstaller: IsActive;
	isWin: IsActive;
	isMac?: IsActive;
	paths: BuildPaths;
	runnerName: LabelString;
	appleTeamId?: LabelString;
	buildRoot?: SourcePath;
	runnersRoot: SourcePath;
	provisioningProfile?: SourcePath;
}

/**
 * Builds the electron-builder config object for compile-runners.
 * @param {BuildOptions} options - Build options
 * @returns {Configuration} electron-builder config
 */
export function getElectronBuilderConfig(options: BuildOptions): Configuration {
	const {
		isInstaller,
		isWin,
		runnerName,
		runnersRoot
	} = options;

	return {
		appId: `com.cycosoft.eyas`,
		productName: `Eyas`,
		artifactName: `${runnerName}${isInstaller ? (isWin ? `-win` : `-mac`) : ``}.\${ext}`,
		copyright: `Copyright © 2023 Cycosoft, LLC`,
		asarUnpack: [`resources/**`],
		files: getExcludedFiles(),
		directories: {
			output: runnersRoot
		},
		compression: options.isDev ? `store` : `maximum`,
		removePackageScripts: true,
		removePackageKeywords: true,
		publish: {
			provider: `generic`,
			url: `https://github.com/cycosoft/Eyas/releases`,
			publishAutoUpdate: true
		},
		mac: getMacConfig(options),
		win: getWinConfig(options),
		nsis: getNsisConfig(),
		linux: getLinuxConfig(options),
		msi: getMsiConfig(),
		pkg: { isRelocatable: false },
		fileAssociations: getFileAssociations(options),
		protocols: getProtocols()
	};
}

/**
 * Returns the list of files to be excluded from the build.
 * @returns {string[]} List of excluded files
 */
function getExcludedFiles(): SourcePath[] {
	return [
		`!**/.vscode/*`,
		`!src/*`,
		`!tests/*`,
		`!.runners/*`,
		`!.test-data/*`,
		`!conductor/*`,
		`!demo/*`,
		`!docs/*`,
		`!dist/*`,
		`!eyas-dist/*`,
		`!_design/*`,
		`!electron.vite.config.{js,ts,mjs,cjs}`,
		`!{.eslintignore,.eslintrc.cjs,eslint.config.mjs,babel.config.js}`,
		`!{.env,.env.*,.npmrc,package-lock.json}`,
		`!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}`,
		`!{playwright.config.js,vitest.config.*.js,dev-app-update.yml}`,
		`!{README.md,CHANGELOG.md,LICENSE.TXT}`
	];
}

/**
 * Returns the macOS configuration for electron-builder.
 * @param {BuildOptions} options - Build options
 * @returns {Configuration['mac']} macOS configuration
 */
function getMacConfig(options: BuildOptions): Configuration[`mac`] {
	return {
		target: options.isInstaller ? [`pkg`, `zip`] : `dir`,
		category: `public.app-category.developer-tools`,
		icon: options.paths.icon,
		provisioningProfile: options.provisioningProfile || undefined,
		hardenedRuntime: true,
		gatekeeperAssess: false,
		...(options.isDev ? { identity: null } : {}),
		notarize: Boolean(options.appleTeamId)
	};
}

/**
 * Returns the Windows configuration for electron-builder.
 * @param {BuildOptions} options - Build options
 * @returns {Configuration['win']} Windows configuration
 */
function getWinConfig(options: BuildOptions): Configuration[`win`] {
	return {
		target: options.isInstaller ? `nsis` : `portable`,
		icon: options.paths.icon,
		...(options.isDev ? {} : { signtoolOptions: { sign: options.paths.codesignWin } as NonNullable<Configuration[`win`]>[`signtoolOptions`] })
	};
}

/**
 * Returns the NSIS configuration for electron-builder.
 * @returns {Configuration['nsis']} NSIS configuration
 */
function getNsisConfig(): Configuration[`nsis`] {
	return {
		oneClick: false,
		allowToChangeInstallationDirectory: true,
		createDesktopShortcut: `always`,
		createStartMenuShortcut: true,
		runAfterFinish: false
	};
}

/**
 * Returns the Linux configuration for electron-builder.
 * @param {BuildOptions} options - Build options
 * @returns {Configuration['linux']} Linux configuration
 */
function getLinuxConfig(options: BuildOptions): Configuration[`linux`] {
	return {
		target: `AppImage`,
		icon: options.paths.icon,
		category: `Utility`
	};
}

/**
 * Returns the MSI configuration for electron-builder.
 * @returns {Configuration['msi']} MSI configuration
 */
function getMsiConfig(): Configuration[`msi`] {
	return {
		oneClick: false,
		runAfterFinish: false,
		createDesktopShortcut: true
	};
}

/**
 * Returns the file associations configuration for electron-builder.
 * @param {BuildOptions} options - Build options
 * @returns {Configuration['fileAssociations']} File associations configuration
 */
function getFileAssociations(options: BuildOptions): Configuration[`fileAssociations`] {
	return [
		{
			ext: `eyas`,
			name: `eyas-db`,
			icon: options.isWin ? options.paths.iconDbWin : options.paths.iconDbMac
		}
	];
}

/**
 * Returns the protocols configuration for electron-builder.
 * @returns {Configuration['protocols']} Protocols configuration
 */
function getProtocols(): Configuration[`protocols`] {
	return [
		{
			name: `Eyas`,
			schemes: [`eyas`],
			role: `Viewer`
		}
	];
}

