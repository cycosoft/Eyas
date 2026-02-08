'use strict';

/**
 * Builds the electron-builder config object for compile-runners.
 * @param {object} options - Build options
 * @param {boolean} options.isDev - Whether this is a dev build
 * @param {boolean} options.isInstaller - Whether to build installer (e.g. msi/pkg)
 * @param {boolean} options.isWin - Whether building for Windows
 * @param {object} options.paths - Paths (icon, iconDbWin, iconDbMac, codesignWin)
 * @param {string} options.runnerName - Artifact name base (e.g. Eyas, EyasInstaller)
 * @param {string} [options.appleTeamId] - APPLE_TEAM_ID or '' for notarize gate
 * @param {string} [options.buildRoot] - App directory
 * @param {string} [options.runnersRoot] - Output directory
 * @param {string} [options.provisioningProfile] - macOS provisioning profile path
 * @returns {object} electron-builder config
 */
function getElectronBuilderConfig(options) {
	const {
		isDev,
		isInstaller,
		isWin,
		paths,
		runnerName,
		appleTeamId = ``,
		buildRoot,
		runnersRoot,
		provisioningProfile = ``
	} = options;

	return {
		appId: `com.cycosoft.eyas`,
		productName: `Eyas`,
		// eslint-disable-next-line quotes
		artifactName: runnerName + '.${ext}',
		copyright: `Copyright © 2023 Cycosoft, LLC`,
		asarUnpack: [`resources/**`],
		directories: {
			app: buildRoot,
			output: runnersRoot
		},
		compression: isDev ? `store` : `maximum`, // `store` | `normal` | `maximum`
		removePackageScripts: true,
		removePackageKeywords: true,
		mac: {
			target: isInstaller ? `pkg` : `dir`,
			category: `public.app-category.developer-tools`,
			icon: paths.icon,
			provisioningProfile,
			...isDev ? { identity: null } : {}, // don't sign in dev
			notarize: Boolean(appleTeamId)
		},
		win: {
			target: isInstaller ? `msi` : `portable`,
			icon: paths.icon,
			...(isDev ? {} : { signtoolOptions: { sign: paths.codesignWin } })
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

module.exports = { getElectronBuilderConfig };
