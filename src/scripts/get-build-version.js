'use strict';

/**
 * Returns a semver-compatible build version string in UTC: YYYY.MMDD.HHMMSS as numeric segments (e.g. 2026.208.42623).
 * @param {Date} [date] - Optional date to use; defaults to current time in UTC.
 * @returns {string}
 */
function getBuildVersion(date) {
	const d = date ? new Date(date.getTime()) : new Date();
	const y = d.getUTCFullYear();
	const mo = d.getUTCMonth() + 1;
	const day = d.getUTCDate();
	const h = d.getUTCHours();
	const min = d.getUTCMinutes();
	const s = d.getUTCSeconds();
	const mmdd = mo * 100 + day;
	const hmmss = h * 10000 + min * 100 + s;
	return `${y}.${mmdd}.${hmmss}`;
}

module.exports = { getBuildVersion };
