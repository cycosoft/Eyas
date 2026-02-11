'use strict';

const EXPIRE_MS = 30 * 60 * 1000; // 30 minutes
let timeoutId = null;
let expired = false;

function startExposeTimeout(onExpire) {
	cancelExposeTimeout();
	expired = false;
	timeoutId = setTimeout(() => {
		expired = true;
		timeoutId = null;
		if (typeof onExpire === `function`) {
			onExpire();
		}
	}, EXPIRE_MS);
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

function resetExposeTimeout(onExpire) {
	startExposeTimeout(onExpire);
}

module.exports = {
	startExposeTimeout,
	cancelExposeTimeout,
	isExposeTimeoutExpired,
	resetExposeTimeout
};
