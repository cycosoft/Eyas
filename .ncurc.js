import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// Helper to extract the first sequence of digits as major version
const getMajorVersion = versionSpec => {
	if (!versionSpec) return 0;
	const match = versionSpec.match(/(\d+)/);
	return match ? parseInt(match[0], 10) : 0;
};

// Cached lookup for registry version to avoid repeated child process calls
let cachedRegistryVersion = null;

const getLatestElectronViteVersion = () => {
	if (cachedRegistryVersion !== null) {
		return cachedRegistryVersion;
	}
	try {
		// SECURITY: Static command string with NO dynamic interpolation to prevent any command/shell injection risks.
		const stdout = execSync(`npm view electron-vite version`, { encoding: `utf8` });
		cachedRegistryVersion = stdout.trim();
	} catch {
		// Robust fallback: if network/registry check is offline, fallback to 5.0.0 (safe default)
		cachedRegistryVersion = `5.0.0`;
	}
	return cachedRegistryVersion;
};

// Read current electron-vite version from package.json safely
const getCurrentElectronVite = context => {
	try {
		const pkgPath = context.packageJsonPath || path.join(currentDir, `package.json`);
		const pkg = JSON.parse(fs.readFileSync(pkgPath, `utf8`));
		return pkg.devDependencies?.[`electron-vite`] || pkg.dependencies?.[`electron-vite`] || ``;
	} catch {
		return ``;
	}
};

// Log a warning notification once when electron-vite is compatible with Vite 8+
let hasLoggedCleanUpNotice = false;
const logCleanUpNoticeOnce = () => {
	if (!hasLoggedCleanUpNotice) {
		console.log(
			`\n\x1b[33m%s\x1b[0m`,
			` [NCU Notice] Current or registry electron-vite is >= 6.x. The custom Vite gating logic in .ncurc.js can now be safely removed!`
		);
		hasLoggedCleanUpNotice = true;
	}
};

// Check if Vite upgrade to 8+ should be blocked due to incompatible electron-vite versions
const shouldBlockVite8 = (upgradedVersion, context) => {
	const upgradedViteMajor = getMajorVersion(upgradedVersion);
	if (upgradedViteMajor < 8) {
		return false; // Vite versions < 8 are fully compatible
	}

	// Check if electron-vite is already 6.x+ in package.json
	const currentElectronVite = getCurrentElectronVite(context);
	const currentElectronViteMajor = getMajorVersion(currentElectronVite);
	if (currentElectronViteMajor >= 6) {
		logCleanUpNoticeOnce();
		return false; // Compatible
	}

	// Check if electron-vite 6.x+ is available in registry
	const latestElectronVite = context.mockLatestElectronVite || getLatestElectronViteVersion();
	const latestElectronViteMajor = getMajorVersion(latestElectronVite);
	if (latestElectronViteMajor >= 6) {
		logCleanUpNoticeOnce();
		return false; // Compatible
	}

	return true;
};

// Cached lookup for registry vue-tsc version to avoid repeated child process calls
let cachedVueTscVersion = null;

const getLatestVueTscVersion = () => {
	if (cachedVueTscVersion !== null) {
		return cachedVueTscVersion;
	}
	try {
		// SECURITY: Static command string with NO dynamic interpolation to prevent any command/shell injection risks.
		const stdout = execSync(`npm view vue-tsc version`, { encoding: `utf8` });
		cachedVueTscVersion = stdout.trim();
	} catch {
		// Robust fallback: if network/registry check is offline, fallback to 3.0.0 (safe default, no bump detected)
		cachedVueTscVersion = `3.0.0`;
	}
	return cachedVueTscVersion;
};

// Read current vue-tsc version from package.json safely
const getCurrentVueTsc = context => {
	try {
		const pkgPath = context.packageJsonPath || path.join(currentDir, `package.json`);
		const pkg = JSON.parse(fs.readFileSync(pkgPath, `utf8`));
		return pkg.devDependencies?.[`vue-tsc`] || pkg.dependencies?.[`vue-tsc`] || ``;
	} catch {
		return ``;
	}
};

// vue-tsc/Volar is pinned to 3.x, built against the classic TS language-service API. TypeScript 7's
// native Go port doesn't expose a stable programmatic API yet (per the TS7 announcement), so Vue
// tooling can't run on it. A vue-tsc major bump is the realistic signal that Vue tooling has caught
// up — until then, block typescript major-7 upgrades to avoid breaking editor support / vue-tsc.
const VUE_TSC_MAJOR_AT_TS7_ANNOUNCEMENT = 3;

let hasLoggedTypeScript7Notice = false;
const logTypeScript7NoticeOnce = () => {
	if (!hasLoggedTypeScript7Notice) {
		console.log(
			`\n\x1b[33m%s\x1b[0m`,
			` [NCU Notice] vue-tsc has shipped a new major version — it may now support TypeScript 7's native API. Re-check Vue/Volar TS7 compatibility and remove the typescript gating logic in .ncurc.js if confirmed!`
		);
		hasLoggedTypeScript7Notice = true;
	}
};

// Check if TypeScript upgrade to 7+ should be blocked pending vue-tsc/Volar TS7 support
const shouldBlockTypeScript7 = (upgradedVersion, context) => {
	const upgradedTsMajor = getMajorVersion(upgradedVersion);
	if (upgradedTsMajor < 7) {
		return false; // TypeScript versions < 7 are fully compatible
	}

	// Check if vue-tsc has already bumped past its TS7-announcement-era major in package.json
	const currentVueTsc = getCurrentVueTsc(context);
	const currentVueTscMajor = getMajorVersion(currentVueTsc);
	if (currentVueTscMajor > VUE_TSC_MAJOR_AT_TS7_ANNOUNCEMENT) {
		logTypeScript7NoticeOnce();
		return false; // Likely compatible — vue-tsc has moved on
	}

	// Check if a newer vue-tsc major is available in the registry
	const latestVueTsc = context.mockLatestVueTsc || getLatestVueTscVersion();
	const latestVueTscMajor = getMajorVersion(latestVueTsc);
	if (latestVueTscMajor > VUE_TSC_MAJOR_AT_TS7_ANNOUNCEMENT) {
		logTypeScript7NoticeOnce();
		return false; // Likely compatible — a newer vue-tsc is out
	}

	return true;
};

const filterResults = (name, { currentVersion: _currentVersion, upgradedVersion }, context = {}) => {
	// 1. Skip electron@42.0.0 specifically
	if (name === `electron` && upgradedVersion === `42.0.0`) {
		return false;
	}

	// 2. Always skip any stable major update that ends in .0.0 (e.g., X.0.0) specifically ONLY for the electron package
	if (name === `electron`) {
		const isMajorZeroZero = /^[vV]?\d+\.0\.0$/.test(upgradedVersion);
		if (isMajorZeroZero) {
			return false;
		}
	}

	// 3. Dynamic vite/electron-vite gating
	if (name === `vite` && shouldBlockVite8(upgradedVersion, context)) {
		return false;
	}

	// 4. Dynamic typescript/vue-tsc gating (TS7 native port lacks a stable API for Vue tooling)
	if (name === `typescript` && shouldBlockTypeScript7(upgradedVersion, context)) {
		return false;
	}

	return true;
};

// Default export ONLY contains valid NCU options
/** @public */
export default {
	format: [`group`, `time`, `cooldown`],
	cooldown: 3,
	filterResults: (name, semverInfo) => filterResults(name, semverInfo)
};

// Named exports specifically for unit tests (ignored by NCU)
export { getMajorVersion as _getMajorVersion, filterResults as _filterResults };
