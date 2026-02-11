import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { startExposeTimeout, cancelExposeTimeout, isExposeTimeoutExpired, resetExposeTimeout } from '../../../src/eyas-core/expose/expose-timeout.js';

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

	test(`expiry callback fires after 30 minutes`, () => {
		const onExpire = vi.fn();
		startExposeTimeout(onExpire);
		expect(onExpire).not.toHaveBeenCalled();
		vi.advanceTimersByTime(30 * 60 * 1000);
		expect(onExpire).toHaveBeenCalledTimes(1);
		expect(isExposeTimeoutExpired()).toBe(true);
	});

	test(`cancel prevents callback`, () => {
		const onExpire = vi.fn();
		startExposeTimeout(onExpire);
		cancelExposeTimeout();
		vi.advanceTimersByTime(30 * 60 * 1000);
		expect(onExpire).not.toHaveBeenCalled();
	});

	test(`reset restarts 30-minute window`, () => {
		const onExpire = vi.fn();
		startExposeTimeout(onExpire);
		vi.advanceTimersByTime(15 * 60 * 1000);
		resetExposeTimeout(onExpire);
		vi.advanceTimersByTime(15 * 60 * 1000);
		expect(onExpire).not.toHaveBeenCalled();
		vi.advanceTimersByTime(15 * 60 * 1000);
		expect(onExpire).toHaveBeenCalledTimes(1);
	});
});
