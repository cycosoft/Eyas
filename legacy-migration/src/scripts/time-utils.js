'use strict';

/**
 * Formats a duration in milliseconds to a human-readable string.
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration (e.g. "30m", "5s")
 */
function formatDuration(ms) {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) {
		return `${hours}h`;
	}

	if (minutes > 0) {
		return `${minutes}m`;
	}

	return `${seconds}s`;
}

module.exports = { formatDuration };
