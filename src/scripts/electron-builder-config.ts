import type { Configuration } from "electron-builder";

interface BuildOptions {
	isDev: boolean;
	isInstaller: boolean;
	isWin: boolean;
	isMac?: boolean;
	paths: {
		icon: string;
		iconDbWin: string;
		iconDbMac: string;
		codesignWin: string;
	};
	runnerName: string;
	appleTeamId?: string;
	buildRoot?: string;
	runnersRoot: string;
	provisioningProfile?: string;
}

/**
 * Builds the electron-builder config object for compile-runners.
 * @param {BuildOptions} options - Build options
 * @returns {Configuration} electron-builder config
 */
export function getElectronBuilderConfig(options: BuildOptions): Configuration {
	const {
		isDev,
		isInstaller,
		isWin,
		paths,
		runnerName,
		appleTeamId = ``,
		runnersRoot,
		provisioningProfile = ``
	} = options;

	return {
		appId: `com.cycosoft.eyas`,
		productName: `Eyas`,
		artifactName: `${runnerName}${isInstaller ? (isWin ? `-win` : `-mac`) : ``}.\${ext}`,
		copyright: `Copyright © 2023 Cycosoft, LLC`,
		asarUnpack: [`resources/**`],
		files: [
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
		],
		directories: {
			output: runnersRoot
		},
		compression: isDev ? `store` : `maximum`, // `store` | `normal` | `maximum`
		removePackageScripts: true,
		removePackageKeywords: true,
		publish: {
			provider: `generic`,
			url: `https://github.com/cycosoft/Eyas/releases`,
			publishAutoUpdate: true
		},
		mac: {
			target: isInstaller ? [`pkg`, `zip`] : `dir`,
			category: `public.app-category.developer-tools`,
			icon: paths.icon,
			provisioningProfile: provisioningProfile || undefined,
			hardenedRuntime: true,
			gatekeeperAssess: false,
			...(isDev ? { identity: null } : {}), // don't sign in dev
			notarize: Boolean(appleTeamId)
		},
		win: {
			target: isInstaller ? `nsis` : `portable`,
			icon: paths.icon,
			...(isDev ? {} : { signtoolOptions: { sign: paths.codesignWin } as NonNullable<Configuration[`win`]>[`signtoolOptions`] })
		},
		nsis: {
			oneClick: false,
			allowToChangeInstallationDirectory: true,
			createDesktopShortcut: `always`,
			createStartMenuShortcut: true,
			runAfterFinish: false
		},
		linux: {
			target: `AppImage`,
			icon: paths.icon,
			category: `Utility`
		},
		msi: {
			oneClick: false, // because there is no feedback to users otherwise
			runAfterFinish: false, // this gives the user an option, but we want mandatory
			createDesktopShortcut: true // so the user knows install process finished
		},
		pkg: {
			isRelocatable: false // always install in /Applications
		},
		fileAssociations: [
			{
				ext: `eyas`,
				name: `eyas-db`,
				icon: isWin ? paths.iconDbWin : paths.iconDbMac
			}
		],
		protocols: [
			{
				name: `Eyas`,
				schemes: [`eyas`],
				role: `Viewer`
			}
		]
	};
}
