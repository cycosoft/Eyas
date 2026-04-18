import type { DurationMS, IsActive } from '../../types/primitives.js';

let timeoutId: NodeJS.Timeout | null = null;
let expired = false;

/**
 * Starts the test server timeout
 * @param onExpire The function to call when the timeout expires
 * @param expireMs The timeout duration in milliseconds
 */
export function startTestServerTimeout(onExpire: () => void, expireMs: DurationMS): void {
	cancelTestServerTimeout();
	expired = false;
	timeoutId = setTimeout(() => {
		expired = true;
		timeoutId = null;
		if (typeof onExpire === `function`) {
			onExpire();
		}
	}, expireMs);
}

/**
 * Cancels the test server timeout if it is running
 */
export function cancelTestServerTimeout(): void {
	if (timeoutId) {
		clearTimeout(timeoutId);
		timeoutId = null;
	}
}

/**
 * Returns whether the test server timeout has expired
 * @returns True if the timeout has expired, false otherwise
 */
export function isTestServerTimeoutExpired(): IsActive {
	return expired;
}

/**
 * Resets the test server timeout
 * @param onExpire The function to call when the timeout expires
 * @param expireMs The timeout duration in milliseconds
 */
export function resetTestServerTimeout(onExpire: () => void, expireMs: DurationMS): void {
	startTestServerTimeout(onExpire, expireMs);
}
