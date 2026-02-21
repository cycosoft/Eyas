'use strict';

let timeoutId = null;
let expired = false;

function startTestServerTimeout(onExpire, expireMs) {
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

function cancelTestServerTimeout() {
	if (timeoutId) {
		clearTimeout(timeoutId);
		timeoutId = null;
	}
}

function isTestServerTimeoutExpired() {
	return expired;
}

function resetTestServerTimeout(onExpire, expireMs) {
	startTestServerTimeout(onExpire, expireMs);
}

module.exports = {
	startTestServerTimeout,
	cancelTestServerTimeout,
	isTestServerTimeoutExpired,
	resetTestServerTimeout
};
