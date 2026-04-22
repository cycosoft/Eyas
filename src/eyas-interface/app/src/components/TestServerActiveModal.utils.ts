import { TEST_SERVER_SESSION_DURATION_MS } from '@/../../../scripts/constants.js';
import type { DomainUrl, TimeString, Timestamp, LabelString, IsActive } from '@/../../../types/primitives.js';

/**
 * Formats the domain URL for display, hiding common ports.
 * @param domain The domain URL to format.
 * @returns The formatted domain URL.
 */
export function formatDisplayUrl(domain: DomainUrl): DomainUrl {
	if (!domain) return ``;
	try {
		const url = new URL(domain);
		// Hide port 90, 80 (http), 443 (https)
		const isHttp = url.protocol === `http:`;
		const isHttps = url.protocol === `https:`;
		const hidePorts = [`90`];
		if (isHttp && url.port === `80`) hidePorts.push(`80`);
		if (isHttps && url.port === `443`) hidePorts.push(`443`);

		// If port is empty string (because it's default for protocol),
		// or if it's in our hidePorts list, we hide it.
		if (hidePorts.includes(url.port) || url.port === ``) {
			return `${url.protocol}//${url.hostname}${url.pathname === `/` ? `` : url.pathname}`;
		}
		return domain;
	} catch {
		return domain;
	}
}

/**
 * Formats a timestamp into a human-readable time string.
 * @param timestamp The timestamp to format.
 * @returns The formatted time string.
 */
export function formatTimestamp(timestamp: Timestamp | null): TimeString {
	if (!timestamp) return ``;
	return new Date(timestamp).toLocaleTimeString([], { hour: `numeric`, minute: `2-digit` }).toLowerCase();
}

/**
 * Calculates the countdown text between now and the end time.
 * @param endTime The end time timestamp.
 * @param now The current timestamp.
 * @returns The countdown string (e.g., "5m30s").
 */
export function calculateCountdownText(endTime: Timestamp | null, now: Timestamp): TimeString {
	if (!endTime) return ``;
	const diff = Math.max(0, endTime - now);
	const mins = Math.floor(diff / 60000);
	const secs = Math.floor((diff % 60000) / 1000);
	return `${mins}m${secs}s`;
}

/**
 * Gets the label for the session extension based on the default duration.
 * @returns The extension label (e.g., "30m").
 */
export function getExtensionLabel(): LabelString {
	const seconds = TEST_SERVER_SESSION_DURATION_MS / 1000;
	if (seconds >= 60 && seconds % 60 === 0) {
		return `${seconds / 60}m`;
	}
	return `${seconds}s`;
}

/**
 * Checks if the session can be extended.
 * @param isExpired Whether the session is already expired.
 * @param endTime The end time timestamp.
 * @param now The current timestamp.
 * @returns True if the session can be extended.
 */
export function checkCanExtend(isExpired: IsActive, endTime: Timestamp | null, now: Timestamp): IsActive {
	if (isExpired) return true;
	if (!endTime) return false;
	return (endTime - now) < TEST_SERVER_SESSION_DURATION_MS;
}
