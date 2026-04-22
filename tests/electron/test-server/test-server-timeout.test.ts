import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { startTestServerTimeout, cancelTestServerTimeout, isTestServerTimeoutExpired, resetTestServerTimeout } from '@core/test-server/test-server-timeout.js';
import { TEST_SERVER_SESSION_DURATION_MS } from '@scripts/constants.js';

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

	test(`expiry callback fires after TEST_SERVER_SESSION_DURATION_MS`, () => {
		const onExpire = vi.fn();
		startTestServerTimeout(onExpire, TEST_SERVER_SESSION_DURATION_MS);
		expect(onExpire).not.toHaveBeenCalled();
		vi.advanceTimersByTime(TEST_SERVER_SESSION_DURATION_MS);
		expect(onExpire).toHaveBeenCalledTimes(1);
		expect(isTestServerTimeoutExpired()).toBe(true);
	});

	test(`cancel prevents callback`, () => {
		const onExpire = vi.fn();
		startTestServerTimeout(onExpire, TEST_SERVER_SESSION_DURATION_MS);
		cancelTestServerTimeout();
		vi.advanceTimersByTime(TEST_SERVER_SESSION_DURATION_MS);
		expect(onExpire).not.toHaveBeenCalled();
	});

	test(`reset restarts the timeout window`, () => {
		const onExpire = vi.fn();
		const half = Math.floor(TEST_SERVER_SESSION_DURATION_MS / 2);
		startTestServerTimeout(onExpire, TEST_SERVER_SESSION_DURATION_MS);
		vi.advanceTimersByTime(half);
		resetTestServerTimeout(onExpire, TEST_SERVER_SESSION_DURATION_MS);
		vi.advanceTimersByTime(half);
		expect(onExpire).not.toHaveBeenCalled();
		vi.advanceTimersByTime(half);
		expect(onExpire).toHaveBeenCalledTimes(1);
	});
});

