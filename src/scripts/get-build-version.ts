import type { AppVersion } from '@registry/primitives.js';

/**
 * Returns a WiX-compatible build version string in UTC: (YY).(M).(MinutesIntoMonth)
 * (e.g. 26.2.32704).
 * @param {Date} [date] - Optional date to use; defaults to current time in UTC.
 * @returns {AppVersion}
 */
export function getBuildVersion(date?: Date): AppVersion {
	const d = date ? new Date(date.getTime()) : new Date();
	const year = d.getUTCFullYear() - 2000;
	const month = d.getUTCMonth() + 1;
	const day = d.getUTCDate();
	const hour = d.getUTCHours();
	const minute = d.getUTCMinutes();

	const minutesIntoMonth = (day * 1440) + (hour * 60) + minute;

	return `${year}.${month}.${minutesIntoMonth}`;
}
