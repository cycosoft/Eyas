import type { LabelString, AppVersion, DomainUrl } from "../types/primitives.js";

/**
 * Sanitizes the page title before including it in the window title.
 * @param {LabelString} rawPageTitle - The raw value from webContents.getTitle().
 * @param {DomainUrl} rawUrl - The raw URL (before data: filtering) from webContents.getURL().
 * @returns {LabelString | undefined} The trimmed page title, or undefined if it should be omitted.
 */
export function sanitizePageTitle(rawPageTitle: LabelString | null | undefined, rawUrl: DomainUrl | null | undefined): LabelString | undefined {
	// Omit empty or whitespace-only titles
	if (!rawPageTitle?.trim()) { return undefined; }

	// Omit when on a data: URL page (getTitle() may return the data URL or encoded content)
	if (rawUrl?.startsWith(`data:`)) { return undefined; }

	// Omit when the title is just the URL (Electron's fallback when <title> is absent)
	if (rawPageTitle === rawUrl) { return undefined; }

	// Omit when the title is just the hostname (Electron's fallback on failed page loads)
	try {
		if (rawUrl) {
			const { hostname } = new URL(rawUrl);
			if (rawPageTitle === hostname) { return undefined; }
		}
	} catch {
		// rawUrl is not a parseable URL — skip this check
	}

	return rawPageTitle.trim();
}

/**
 * Generates the application title based on the provided title, version, and optional URL.
 * @param {LabelString} title The title of the application.
 * @param {AppVersion} version The version string.
 * @param {DomainUrl} [url] The current URL being viewed (optional).
 * @param {LabelString} [pageTitle] The document.title set by the web page (optional).
 * @returns {LabelString} The formatted application title.
 */
export function getAppTitle(title: LabelString, version: AppVersion, url?: DomainUrl, pageTitle?: LabelString): LabelString {
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
