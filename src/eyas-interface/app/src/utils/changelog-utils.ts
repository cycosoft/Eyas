import semver from 'semver';
import type { ChangelogEntry, MarkdownToken } from '../types/changelog.js';

/**
 * Filter and aggregate changelog entries between two versions.
 * @param {ChangelogEntry[]} changelog - The parsed CHANGELOG.json array.
 * @param {string} fromVersion - The last seen version.
 * @returns {ChangelogEntry[]} - Aggregated changelog entries.
 */
export function getAggregatedChanges(changelog: ChangelogEntry[], fromVersion: string): ChangelogEntry[] {
	if (!changelog || !Array.isArray(changelog)) { return []; }

	return changelog.filter(entry => {
		const v = entry.version;
		// Include if version > fromVersion
		try {
			return semver.gt(v, fromVersion);
		} catch {
			// fallback to simple comparison if semver fails (e.g. invalid string)
			return v > fromVersion;
		}
	});
}

/**
 * Basic markdown tokenization for a specific subset:
 * - `code` -> { type: 'code', content: 'code' }
 * - [text](url) -> { type: 'link', content: 'text', url: 'url' }
 * - Plain text -> { type: 'text', content: '...' }
 * @param {string} text - The input text.
 * @returns {MarkdownToken[]} - List of tokens.
 */
export function tokenizeMarkdownSubset(text: string): MarkdownToken[] {
	if (!text) { return []; }

	const tokens: MarkdownToken[] = [];
	const regex = /(`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(text)) !== null) {
		// add plain text before the match
		if (match.index > lastIndex) {
			tokens.push({ type: `text`, content: text.substring(lastIndex, match.index) });
		}

		const chunk = match[0];
		if (chunk.startsWith(`\``)) {
			// inline code
			tokens.push({ type: `code`, content: chunk.substring(1, chunk.length - 1) });
		} else if (chunk.startsWith(`[`)) {
			// link
			const linkMatch = chunk.match(/\[([^\]]+)\]\(([^)]+)\)/);
			if (linkMatch) {
				tokens.push({ type: `link`, content: linkMatch[1], url: linkMatch[2] });
			} else {
				// fallback to text if malformed
				tokens.push({ type: `text`, content: chunk });
			}
		}

		lastIndex = regex.lastIndex;
	}

	// add remaining text
	if (lastIndex < text.length) {
		tokens.push({ type: `text`, content: text.substring(lastIndex) });
	}

	return tokens;
}
