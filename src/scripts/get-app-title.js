'use strict';

/**
 * Sanitizes the page title before including it in the window title.
 * @param {string} rawPageTitle - The raw value from webContents.getTitle().
 * @param {string} rawUrl - The raw URL (before data: filtering) from webContents.getURL().
 * @returns {string|null} The trimmed page title, or null if it should be omitted.
 */
function sanitizePageTitle(rawPageTitle, rawUrl) {
	// Omit empty or whitespace-only titles
	if (!rawPageTitle?.trim()) { return null; }

	// Omit when on a data: URL page (getTitle() may return the data URL or encoded content)
	if (rawUrl?.startsWith(`data:`)) { return null; }

	// Omit when the title is just the URL (Electron's fallback when <title> is absent)
	if (rawPageTitle === rawUrl) { return null; }

	return rawPageTitle.trim();
}

/**
 * Generates the application title based on the provided title, version, and optional URL.
 * @param {string} title The title of the application.
 * @param {string} version The version string.
 * @param {string} [url] The current URL being viewed (optional).
 * @param {string} [pageTitle] The document.title set by the web page (optional).
 * @returns {string} The formatted application title.
 */
function getAppTitle(title, version, url, pageTitle) {
	let output = `${title} :: ${version} ✨`;

	// Add the page title if it's a non-empty, non-whitespace string
	if (pageTitle?.trim()) {
		output += ` — ${pageTitle.trim()}`;
	}

	if (url) {
		output += ` ( ${url} )`;
	}

	return output;
}

module.exports = { getAppTitle, sanitizePageTitle };
