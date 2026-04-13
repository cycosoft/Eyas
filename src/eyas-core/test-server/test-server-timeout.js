'use strict';

let timeoutId = null;
let expired = false;

export function startTestServerTimeout(onExpire, expireMs) {
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

export function cancelTestServerTimeout() {
	if (timeoutId) {
		clearTimeout(timeoutId);
		timeoutId = null;
	}
}

export function isTestServerTimeoutExpired() {
	return expired;
}

export function resetTestServerTimeout(onExpire, expireMs) {
	startTestServerTimeout(onExpire, expireMs);
}

