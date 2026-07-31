import { describe, test, expect, vi, afterEach } from 'vitest';
import {
	isEyasProtocolUrl,
	handleEyasProtocolUrl,
	getEyasUrlFromCommandLine,
	awaitInitialDeepLink
} from '@core/deep-link-handler.js';
import type { ConfigToLoad } from '@registry/core.js';
import type { DurationMS } from '@registry/primitives.js';

const LOAD_TYPES = { WEB: `web` };

describe(`isEyasProtocolUrl`, () => {
	test(`returns true for eyas://host/path`, () => {
		expect(isEyasProtocolUrl(`eyas://host/path`)).toBe(true);
	});

	test(`returns true for eyas://x`, () => {
		expect(isEyasProtocolUrl(`eyas://x`)).toBe(true);
	});

	test(`returns false for https URL`, () => {
		expect(isEyasProtocolUrl(`https://example.com`)).toBe(false);
	});

	test(`returns false for eyas:/ (single slash)`, () => {
		expect(isEyasProtocolUrl(`eyas:/`)).toBe(false);
	});

	test(`returns false for empty string`, () => {
		expect(isEyasProtocolUrl(``)).toBe(false);
	});

	test(`returns false for null and undefined`, () => {
		expect(isEyasProtocolUrl(null)).toBe(false);
		expect(isEyasProtocolUrl(undefined)).toBe(false);
	});

	test(`returns false for non-string`, () => {
		expect(isEyasProtocolUrl(123)).toBe(false);
		expect(isEyasProtocolUrl({})).toBe(false);
	});
});

describe(`handleEyasProtocolUrl`, () => {
	test(`does nothing for invalid url`, async () => {
		const loadConfig = vi.fn();
		const startAFreshTest = vi.fn();
		const setConfigToLoad = vi.fn();
		const context = {
			getAppWindow: (): null => null,
			setConfigToLoad,
			loadConfig,
			startAFreshTest,
			LOAD_TYPES
		};
		await handleEyasProtocolUrl(`https://a.com`, context);
		expect(loadConfig).not.toHaveBeenCalled();
		expect(startAFreshTest).not.toHaveBeenCalled();
		expect(setConfigToLoad).not.toHaveBeenCalled();
	});

	test(`calls setConfigToLoad when window is null`, async () => {
		const loadConfig = vi.fn();
		const startAFreshTest = vi.fn();
		const setConfigToLoad = vi.fn();
		const context = {
			getAppWindow: (): null => null,
			setConfigToLoad,
			loadConfig,
			startAFreshTest,
			LOAD_TYPES
		};
		const url = `eyas://host/path`;
		await handleEyasProtocolUrl(url, context);
		expect(setConfigToLoad).toHaveBeenCalledTimes(1);
		expect(setConfigToLoad).toHaveBeenCalledWith({
			method: LOAD_TYPES.WEB,
			path: url
		});
		expect(loadConfig).not.toHaveBeenCalled();
		expect(startAFreshTest).not.toHaveBeenCalled();
	});

	test(`calls loadConfig then startAFreshTest when window exists`, async () => {
		const loadConfig = vi.fn().mockResolvedValue(undefined);
		const startAFreshTest = vi.fn();
		const setConfigToLoad = vi.fn();
		const context = {
			getAppWindow: (): object => ({}),
			setConfigToLoad,
			loadConfig,
			startAFreshTest,
			LOAD_TYPES
		};
		const url = `eyas://host/path`;
		await handleEyasProtocolUrl(url, context);
		expect(loadConfig).toHaveBeenCalledTimes(1);
		expect(loadConfig).toHaveBeenCalledWith(LOAD_TYPES.WEB, url);
		expect(startAFreshTest).toHaveBeenCalledTimes(1);
		expect(setConfigToLoad).not.toHaveBeenCalled();
	});
});

describe(`getEyasUrlFromCommandLine`, () => {
	test(`returns first arg that starts with eyas://`, () => {
		expect(getEyasUrlFromCommandLine([`a`, `eyas://b/c`, `d`])).toBe(`eyas://b/c`);
	});

	test(`returns undefined when no eyas URL in argv`, () => {
		expect(getEyasUrlFromCommandLine([`a`, `b`])).toBeUndefined();
	});

	test(`returns undefined for empty array`, () => {
		expect(getEyasUrlFromCommandLine([])).toBeUndefined();
	});
});

describe(`awaitInitialDeepLink`, () => {
	const originalPlatform = process.platform;

	type PlatformName = string;

	function setPlatform(platform: PlatformName): void {
		Object.defineProperty(process, `platform`, { value: platform });
	}

	afterEach(() => {
		setPlatform(originalPlatform);
	});

	test(`resolves immediately when configToLoad is already populated (argv-based launch)`, async () => {
		setPlatform(`darwin`);
		const start = Date.now();
		await awaitInitialDeepLink(() => ({ method: LOAD_TYPES.WEB, path: `eyas://a` } as ConfigToLoad), 5000 as DurationMS);
		expect(Date.now() - start).toBeLessThan(50);
	});

	test(`resolves immediately on non-macOS platforms even when configToLoad is empty`, async () => {
		setPlatform(`win32`);
		const start = Date.now();
		await awaitInitialDeepLink(() => ({} as ConfigToLoad), 5000 as DurationMS);
		expect(Date.now() - start).toBeLessThan(50);
	});

	test(`on macOS, resolves as soon as configToLoad becomes populated, without waiting for the full timeout`, async () => {
		setPlatform(`darwin`);
		let configToLoad: ConfigToLoad = {};
		setTimeout(() => { configToLoad = { method: LOAD_TYPES.WEB, path: `eyas://a` }; }, 30);

		const start = Date.now();
		await awaitInitialDeepLink(() => configToLoad, 5000 as DurationMS);
		const elapsed = Date.now() - start;

		expect(elapsed).toBeGreaterThanOrEqual(30);
		expect(elapsed).toBeLessThan(500);
	});

	test(`on macOS, gives up after the timeout when no deep link ever arrives`, async () => {
		setPlatform(`darwin`);
		const start = Date.now();
		await awaitInitialDeepLink(() => ({} as ConfigToLoad), 50 as DurationMS);
		expect(Date.now() - start).toBeGreaterThanOrEqual(50);
	});
});
