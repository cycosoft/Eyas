'use strict';

let timeoutId = null;
let expired = false;

function startExposeTimeout(onExpire, expireMs) {
	cancelExposeTimeout();
	expired = false;
	timeoutId = setTimeout(() => {
		expired = true;
		timeoutId = null;
		if (typeof onExpire === `function`) {
			onExpire();
		}
	}, expireMs);
}

function cancelExposeTimeout() {
	if (timeoutId) {
		clearTimeout(timeoutId);
		timeoutId = null;
	}
}

function isExposeTimeoutExpired() {
	return expired;
}

function resetExposeTimeout(onExpire, expireMs) {
	startExposeTimeout(onExpire, expireMs);
}

module.exports = {
	startExposeTimeout,
	cancelExposeTimeout,
	isExposeTimeoutExpired,
	resetExposeTimeout
};
