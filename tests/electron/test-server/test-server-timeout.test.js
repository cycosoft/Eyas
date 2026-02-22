import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { startTestServerTimeout, cancelTestServerTimeout, isTestServerTimeoutExpired, resetTestServerTimeout } from '../../../src/eyas-core/test-server/test-server-timeout.js';
import { EXPIRE_MS } from '../../../src/scripts/constants.js';

describe(`test-server-timeout`, () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cancelTestServerTimeout();
		vi.useRealTimers();
	});

	test(`isTestServerTimeoutExpired returns false before start`, () => {
		expect(isTestServerTimeoutExpired()).toBe(false);
	});

	test(`expiry callback fires after EXPIRE_MS`, () => {
		const onExpire = vi.fn();
		startTestServerTimeout(onExpire, EXPIRE_MS);
		expect(onExpire).not.toHaveBeenCalled();
		vi.advanceTimersByTime(EXPIRE_MS);
		expect(onExpire).toHaveBeenCalledTimes(1);
		expect(isTestServerTimeoutExpired()).toBe(true);
	});

	test(`cancel prevents callback`, () => {
		const onExpire = vi.fn();
		startTestServerTimeout(onExpire, EXPIRE_MS);
		cancelTestServerTimeout();
		vi.advanceTimersByTime(EXPIRE_MS);
		expect(onExpire).not.toHaveBeenCalled();
	});

	test(`reset restarts the timeout window`, () => {
		const onExpire = vi.fn();
		const half = Math.floor(EXPIRE_MS / 2);
		startTestServerTimeout(onExpire, EXPIRE_MS);
		vi.advanceTimersByTime(half);
		resetTestServerTimeout(onExpire, EXPIRE_MS);
		vi.advanceTimersByTime(half);
		expect(onExpire).not.toHaveBeenCalled();
		vi.advanceTimersByTime(half);
		expect(onExpire).toHaveBeenCalledTimes(1);
	});
});

