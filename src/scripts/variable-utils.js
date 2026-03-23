'use strict';

const { isURL } = require(`validator`);

// Regex patterns mirroring those used in setMenu() and navigateVariable()
const REGEX_ENV_URL = /{_env\.url}/g;
const REGEX_ENV_KEY = /{_env\.key}/g;
const REGEX_TESTDOMAIN = /{testdomain}/g;  // deprecated alias for _env.url
const REGEX_ALL_VARIABLES = /{[^{}]+}/g;

/**
 * Replaces all Eyas-managed (_env.*) and deprecated (testdomain) variable
 * tokens in a URL with the values from the currently selected environment.
 *
 * Guards: if the URL contains {_env.url} or {testdomain} but no env.url is
 * set, returns null to signal that navigation should be blocked.
 *
 * {_env.key} has NO guard — it substitutes as "" when absent, so navigation
 * always proceeds (a domain without a key is valid).
 *
 * @param {string} url - The raw URL template containing variable tokens
 * @param {{ url: string|null, key: string|null|undefined }|null} env - Selected environment
 * @returns {string|null} The substituted URL, or null if env.url is required but missing
 */
function substituteEnvVariables(url, env) {
	const needsDomain = REGEX_ENV_URL.test(url) || REGEX_TESTDOMAIN.test(url);

	// Reset lastIndex after test() calls (global regex is stateful)
	REGEX_ENV_URL.lastIndex = 0;
	REGEX_TESTDOMAIN.lastIndex = 0;

	// Guard: block navigation if no domain is selected
	if (needsDomain && !env?.url) {
		return null;
	}

	const envUrl = env?.url || ``;
	const envKey = env?.key ?? ``;

	return url
		.replace(REGEX_ENV_URL, envUrl)
		.replace(REGEX_TESTDOMAIN, envUrl)
		.replace(REGEX_ENV_KEY, envKey);
}

/**
 * Performs a stub-replacement on all variable tokens in a URL and checks
 * whether the result is a valid URL. Used by setMenu() to decide if a
 * variable link item should be enabled in the application menu.
 *
 * Stub values match what the real substitution produces structurally:
 *   {_env.url}   → validating.com  (a valid hostname)
 *   {_env.key}   → validating      (a valid subdomain segment)
 *   {testdomain} → validating.com  (deprecated alias)
 *   all others   → validating      (generic non-empty value)
 *
 * @param {string} url - The raw URL template to validate
 * @returns {boolean} Whether the stub-replaced URL is a valid URL
 */
function isVariableLinkValid(url) {
	const testUrl = url
		.replace(/{_env\.url}/g, `validating.com`)
		.replace(/{_env\.key}/g, `validating`)
		.replace(/{testdomain}/g, `validating.com`)
		.replace(/{[^{}]+}/g, `validating`);
	return isURL(testUrl);
}

/**
 * Returns true if the URL still contains any variable tokens after
 * Eyas-managed variable substitution. Used by navigateVariable() to decide
 * whether to open the VariablesModal or navigate directly.
 *
 * @param {string} url - The URL after substituteEnvVariables() has run
 * @returns {boolean} True if user-input variables remain; false if ready to navigate
 */
function hasRemainingVariables(url) {
	return !!url.match(REGEX_ALL_VARIABLES)?.length;
}

module.exports = { substituteEnvVariables, isVariableLinkValid, hasRemainingVariables };
