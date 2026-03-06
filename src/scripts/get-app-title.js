'use strict';

/**
 * Generates the application title based on the provided title, version, and optional URL.
 * @param {string} title The title of the application.
 * @param {string} version The version string.
 * @param {string} [url] The current URL being viewed (optional).
 * @returns {string} The formatted application title.
 */
function getAppTitle(title, version, url) {
	let output = `${title} :: ${version} ✨`;

	if (url) {
		output += ` ( ${url} )`;
	}

	return output;
}

module.exports = getAppTitle;
