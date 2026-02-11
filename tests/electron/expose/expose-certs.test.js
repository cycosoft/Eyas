import { describe, test, expect } from 'vitest';
import { getCerts, isCaInstalled } from '../../../src/eyas-core/expose/expose-certs.js';

describe(`expose-certs`, () => {
	test(`getCerts returns key and cert`, async () => {
		const result = await getCerts([`localhost`]);
		expect(result).toHaveProperty(`key`);
		expect(result).toHaveProperty(`cert`);
		expect(typeof result.key).toBe(`string`);
		expect(typeof result.cert).toBe(`string`);
		expect(result.key).toMatch(/BEGIN.*PRIVATE KEY/);
		expect(result.cert).toMatch(/BEGIN CERTIFICATE/);
	});

	test(`isCaInstalled returns boolean`, () => {
		const result = isCaInstalled();
		expect(typeof result).toBe(`boolean`);
	});
});
