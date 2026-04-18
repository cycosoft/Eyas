import { expect, test, describe, vi } from 'vitest';
// import getConfig from '../../src/scripts/get-config.js'; // imported dynamically in tests
import { LOAD_TYPES } from '../../src/scripts/constants.js';
import fs from 'fs';
import path from 'path';

describe(`getConfig - CommonJS`, () => {
	const tempDir = path.resolve(`tests/tmp/cjs`);
	const testConfigPath = path.join(tempDir, `.eyas.config.js`);

	test(`should load a CommonJS config correctly`, async () => {
		// Create temp dir
		if (!fs.existsSync(tempDir)) { fs.mkdirSync(tempDir, { recursive: true }); }

		// Create a CJS config
		const cjsContent = `module.exports = { title: 'CJS Test App', source: 'cjs-demo' };`;
		fs.writeFileSync(testConfigPath, cjsContent);

		// Mock roots.config
		vi.doMock(`../../src/scripts/get-roots.js`, async () => {
			const actual = await vi.importActual(`../../src/scripts/get-roots.js`);
			return {
				default: {
					...(actual.default as any),
					config: tempDir
				}
			};
		});

		// Import getConfig after mocking
		// Dynamic import is required here to ensure getConfig is evaluated AFTER vi.doMock
		// eslint-disable-next-line no-restricted-syntax
		const { default: getConfig } = await import(`../../src/scripts/get-config.js`);

		try {
			const config = await getConfig(LOAD_TYPES.CLI);
			expect(config.title).toBe(`CJS Test App`);
			expect(config.source).toContain(`cjs-demo`);
			expect(config.meta.isConfigLoaded).toBe(true);
		} finally {
			// Cleanup
			if (fs.existsSync(testConfigPath)) {
				fs.unlinkSync(testConfigPath);
			}
			if (fs.existsSync(tempDir)) {
				fs.rmdirSync(tempDir);
			}
		}
	});
});
