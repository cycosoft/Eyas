import { describe, test, expect, vi, beforeEach } from 'vitest';
import { addHostEntry, removeHostEntry, removeAutoAdded, wasAutoAdded } from '../../../src/eyas-core/expose/expose-hosts.js';

describe(`expose-hosts`, () => {
	let mockHostile;

	beforeEach(() => {
		mockHostile = {
			set: vi.fn(),
			remove: vi.fn()
		};
		vi.clearAllMocks();
	});

	test(`addHostEntry calls hostile.set with 127.0.0.1 and hostname`, () => {
		addHostEntry(`local.test`, mockHostile);
		expect(mockHostile.set).toHaveBeenCalledWith(`127.0.0.1`, `local.test`);
		expect(wasAutoAdded(`local.test`)).toBe(true);
	});

	test(`removeHostEntry calls hostile.remove for auto-added host`, () => {
		addHostEntry(`local.test`, mockHostile);
		removeHostEntry(`local.test`, mockHostile);
		expect(mockHostile.remove).toHaveBeenCalledWith(`127.0.0.1`, `local.test`);
		expect(wasAutoAdded(`local.test`)).toBe(false);
	});

	test(`removeAutoAdded removes all auto-added entries`, () => {
		addHostEntry(`local.test`, mockHostile);
		addHostEntry(`other.test`, mockHostile);
		removeAutoAdded(mockHostile);
		expect(mockHostile.remove).toHaveBeenCalledTimes(2);
		expect(wasAutoAdded(`local.test`)).toBe(false);
		expect(wasAutoAdded(`other.test`)).toBe(false);
	});
});
