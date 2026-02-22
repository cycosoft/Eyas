import { describe, test, expect } from 'vitest';
import { getCerts } from '../../../src/eyas-core/test-server/test-server-certs.js';

describe(`test-server-certs`, () => {
	test(`getCerts returns key and cert`, async () => {
		const result = await getCerts([`localhost`]);
		expect(result).toHaveProperty(`key`);
		expect(result).toHaveProperty(`cert`);
		expect(typeof result.key).toBe(`string`);
		expect(typeof result.cert).toBe(`string`);
		expect(result.key).toMatch(/BEGIN.*PRIVATE KEY/);
		expect(result.cert).toMatch(/BEGIN CERTIFICATE/);
	});

	test(`getCerts caches results for same domains`, async () => {
		const result1 = await getCerts([`localhost`, `127.0.0.1`]);
		const result2 = await getCerts([`127.0.0.1`, `localhost`]); // same domains, different order
		expect(result1).toBe(result2); // should be the exact same cached object
	});

	test(`getCerts generates different certs for different domains`, async () => {
		const result1 = await getCerts([`localhost`]);
		const result2 = await getCerts([`example.com`]);
		expect(result1).not.toBe(result2);
		expect(result1.key).not.toBe(result2.key);
	});
});
