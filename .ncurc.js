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

	return true;
};

// Default export ONLY contains valid NCU options
export default {
	format: [`group`, `time`],
	cooldown: 3,
	filterResults: (name, semverInfo) => filterResults(name, semverInfo)
};

// Named exports specifically for unit tests (ignored by NCU)
export { getMajorVersion as _getMajorVersion, filterResults as _filterResults };
