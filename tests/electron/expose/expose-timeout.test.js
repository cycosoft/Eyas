import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { startExposeTimeout, cancelExposeTimeout, isExposeTimeoutExpired, resetExposeTimeout } from '../../../src/eyas-core/expose/expose-timeout.js';
import { EXPIRE_MS } from '../../../src/scripts/constants.js';

describe(`expose-timeout`, () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cancelExposeTimeout();
		vi.useRealTimers();
	});

	test(`isExposeTimeoutExpired returns false before start`, () => {
		expect(isExposeTimeoutExpired()).toBe(false);
	});

	test(`expiry callback fires after EXPIRE_MS`, () => {
		const onExpire = vi.fn();
		startExposeTimeout(onExpire, EXPIRE_MS);
		expect(onExpire).not.toHaveBeenCalled();
		vi.advanceTimersByTime(EXPIRE_MS);
		expect(onExpire).toHaveBeenCalledTimes(1);
		expect(isExposeTimeoutExpired()).toBe(true);
	});

	test(`cancel prevents callback`, () => {
		const onExpire = vi.fn();
		startExposeTimeout(onExpire, EXPIRE_MS);
		cancelExposeTimeout();
		vi.advanceTimersByTime(EXPIRE_MS);
		expect(onExpire).not.toHaveBeenCalled();
	});

	test(`reset restarts the timeout window`, () => {
		const onExpire = vi.fn();
		const half = Math.floor(EXPIRE_MS / 2);
		startExposeTimeout(onExpire, EXPIRE_MS);
		vi.advanceTimersByTime(half);
		resetExposeTimeout(onExpire, EXPIRE_MS);
		vi.advanceTimersByTime(half);
		expect(onExpire).not.toHaveBeenCalled();
		vi.advanceTimersByTime(half);
		expect(onExpire).toHaveBeenCalledTimes(1);
	});
});

