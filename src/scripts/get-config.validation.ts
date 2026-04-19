import _path from "node:path";
import _fs from "node:fs";
import roots from "./get-roots.js";
import crypto from "node:crypto";
import * as dateFns from "date-fns";

// Types
import type { ValidatedConfig, EyasConfig, EyasMeta, DomainConfig } from "../types/config.js";
import type { IsActive, AppVersion, TestId, DurationHours } from "../types/primitives.js";

// Git Utilities
import {
	getBranchName,
	getCommitHash,
	getUserName,
	getCompanyId,
	getProjectId
} from "./get-config.git.js";

const { addHours } = dateFns;

/**
 * Returns the validated configuration based on the loaded config
 * @param rawConfig The raw configuration object
 * @param isConfigLoaded Whether the config was actually loaded
 * @returns The validated configuration
 */
export function validateConfig(rawConfig: EyasConfig | null, isConfigLoaded: IsActive = false): ValidatedConfig {
	// setup
	const loadedConfig = rawConfig || {};
	const expiresIn = validateExpiration(loadedConfig.outputs?.expires);

	// configuration merge and validation step
	return {
		// use given value or resolve to default location
		source: loadedConfig.source || _path.resolve(roots.config, `dist`),
		domains: validateCustomDomain(loadedConfig.domain || loadedConfig.domains),
		title: (loadedConfig.title || `Eyas`).trim(),
		version: (loadedConfig.version || `${getBranchName()}.${getCommitHash()}` || `Unspecified Version`).trim(),
		viewports: loadedConfig.viewports || [],
		links: loadedConfig.links || [],

		outputs: {
			expires: expiresIn // hours
		},

		// data that is provided by the CLI step, not the user.
		meta: getValidatedMeta(loadedConfig.meta, expiresIn, isConfigLoaded)
	};
}

/**
 * Returns the validated metadata based on the loaded config
 * @param rawMeta The raw metadata object
 * @param expiresIn The number of hours until the test expires
 * @param isConfigLoaded Whether the config was actually loaded
 * @returns The validated metadata
 */
function getValidatedMeta(rawMeta: Partial<EyasMeta> | undefined, expiresIn: DurationHours, isConfigLoaded: IsActive): EyasMeta {
	const meta = rawMeta || {};

	return {
		expires: (meta.expires as Date) || getExpirationDate(expiresIn),
		gitBranch: meta.gitBranch || getBranchName(),
		gitHash: meta.gitHash || getCommitHash(),
		gitUser: meta.gitUser || getUserName(),
		compiled: (meta.compiled as Date) || new Date(),
		eyas: meta.eyas || getCliVersion(),
		companyId: meta.companyId || getCompanyId(),
		projectId: meta.projectId || getProjectId(),
		testId: meta.testId || getTestId(),
		isConfigLoaded
	};
}

/**
 * Validate the user input for the custom domain
 * @param input The raw domain input
 * @returns The validated domain configuration
 */
export function validateCustomDomain(input?: string | string[] | DomainConfig[]): DomainConfig[] {
	// default to an empty array
	const output: DomainConfig[] = [/* { url: ``, title: `Staging` } */];

	// if the input is a string
	if (typeof input === `string`) {
		// convert to an array
		output.push({ url: input, title: input });
	}

	// if the input is an array
	if (Array.isArray(input)) {
		// loop through each item
		input.forEach(domain => {
			// if the domain is a string
			if (typeof domain === `string`) {
				// convert to an object
				output.push({ url: domain, title: domain });
			}

			// if the domain is an object
			if (typeof domain === `object`) {
				// add to the output
				output.push(domain);
			}
		});
	}

	// return validated input
	return output;
}

/**
 * Get the version of the cli
 * @returns The CLI version
 */
function getCliVersion(): AppVersion {
	try {
		const { version } = JSON.parse(_fs.readFileSync(_path.join(roots.module, `package.json`), `utf-8`));
		return version;
	} catch (error) {
		console.error(`Error getting CLI version:`, error);
		return `0.0.0`;
	}
}

/**
 * Create a unique id for the test
 * @returns A unique test ID
 */
export function getTestId(): TestId {
	return crypto.randomUUID();
}

/**
 * Validate the user input for the expiration
 * @param hours The raw expiration hours
 * @returns The validated expiration hours
 */
export function validateExpiration(hours?: unknown): DurationHours {
	// default
	const defaultHours = 7 * 24; // 168 hours or 1 week
	const minHours = 1;
	const maxHours = 30 * 24;

	let output = typeof hours === `number` ? hours : defaultHours;

	// if not a number
	if (isNaN(output)) {
		output = defaultHours;
	}

	// must be a whole number
	if (!Number.isInteger(output)) {
		output = Math.ceil(output);
	}

	// must be above the minimum
	if (output < minHours) {
		output = minHours;
	}

	// must be below the maximum
	if (output > maxHours) {
		output = maxHours;
	}

	return output;
}

/**
 * Get the default preview expiration
 * @param expiresInHours The number of hours until expiration
 * @returns The expiration date
 */
export function getExpirationDate(expiresInHours: DurationHours): Date {
	const now = new Date();
	return addHours(now, expiresInHours);
}
