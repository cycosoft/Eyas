import { describe, test, expect, vi } from 'vitest';
import {
	isEyasProtocolUrl,
	handleEyasProtocolUrl,
	getEyasUrlFromCommandLine
} from '../../src/eyas-core/deep-link-handler.js';

const LOAD_TYPES = { WEB: `web` };

describe('isEyasProtocolUrl', () => {
	test('returns true for eyas://host/path', () => {
		expect(isEyasProtocolUrl(`eyas://host/path`)).toBe(true);
	});

	test('returns true for eyas://x', () => {
		expect(isEyasProtocolUrl(`eyas://x`)).toBe(true);
	});

	test('returns false for https URL', () => {
		expect(isEyasProtocolUrl(`https://example.com`)).toBe(false);
	});

	test('returns false for eyas:/ (single slash)', () => {
		expect(isEyasProtocolUrl(`eyas:/`)).toBe(false);
	});

	test('returns false for empty string', () => {
		expect(isEyasProtocolUrl(``)).toBe(false);
	});

	test('returns false for null and undefined', () => {
		expect(isEyasProtocolUrl(null)).toBe(false);
		expect(isEyasProtocolUrl(undefined)).toBe(false);
	});

	test('returns false for non-string', () => {
		expect(isEyasProtocolUrl(123)).toBe(false);
		expect(isEyasProtocolUrl({})).toBe(false);
	});
});

describe('handleEyasProtocolUrl', () => {
	test('does nothing for invalid url', async () => {
		const loadConfig = vi.fn();
		const startAFreshTest = vi.fn();
		const setConfigToLoad = vi.fn();
		const context = {
			getAppWindow: () => null,
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

	test('calls setConfigToLoad when window is null', async () => {
		const loadConfig = vi.fn();
		const startAFreshTest = vi.fn();
		const setConfigToLoad = vi.fn();
		const context = {
			getAppWindow: () => null,
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

	test('calls loadConfig then startAFreshTest when window exists', async () => {
		const loadConfig = vi.fn().mockResolvedValue(undefined);
		const startAFreshTest = vi.fn();
		const setConfigToLoad = vi.fn();
		const context = {
			getAppWindow: () => ({}),
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

describe('getEyasUrlFromCommandLine', () => {
	test('returns first arg that starts with eyas://', () => {
		expect(getEyasUrlFromCommandLine([`a`, `eyas://b/c`, `d`])).toBe(`eyas://b/c`);
	});

	test('returns undefined when no eyas URL in argv', () => {
		expect(getEyasUrlFromCommandLine([`a`, `b`])).toBeUndefined();
	});

	test('returns undefined for empty array', () => {
		expect(getEyasUrlFromCommandLine([])).toBeUndefined();
	});
});
