import semver from 'semver';

/**
 * Filter and aggregate changelog entries between two versions.
 * @param {Array} changelog - The parsed CHANGELOG.json array.
 * @param {string} fromVersion - The last seen version.
 * @param {string} toVersion - The current app version.
 * @returns {Array} - Aggregated changelog entries.
 */
export function getAggregatedChanges(changelog, fromVersion, toVersion) {
	if (!changelog || !Array.isArray(changelog)) { return []; }

	return changelog.filter(entry => {
		const v = entry.version;
		// Include if version > fromVersion AND version <= toVersion
		try {
			return semver.gt(v, fromVersion) && semver.lte(v, toVersion);
		} catch {
			// fallback to simple comparison if semver fails (e.g. invalid string)
			return v > fromVersion && v <= toVersion;
		}
	});
}

/**
 * Basic markdown-to-html converter for a specific subset:
 * - `code` -> <code>code</code>
 * - [text](url) -> <a href="url" target="_blank" rel="noopener noreferrer">text</a>
 * - HTML entity escaping for security.
 * @param {string} text - The input text.
 * @returns {string} - The formatted HTML string.
 */
export function formatMarkdownSubset(text) {
	if (!text) { return ``; }

	// 1. Escape HTML for security
	let html = text
		.replace(/&/g, `&amp;`)
		.replace(/</g, `&lt;`)
		.replace(/>/g, `&gt;`)
		.replace(/"/g, `&quot;`)
		.replace(/'/g, `&#039;`);

	// 2. Inline code: `code` -> <code>code</code>
	// We use [^`]+ to match content between backticks.
	html = html.replace(/`([^`]+)`/g, `<code>$1</code>`);

	// 3. Links: [text](url) -> <a href="url" target="_blank" rel="noopener noreferrer">text</a>
	// We need to un-escape the entities inside the URL part for validator.isURL if we were using it,
	// but here we trust the schema/conversion for now.
	// Actually, let's just use a regex.
	html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
		return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
	});

	return html;
}
