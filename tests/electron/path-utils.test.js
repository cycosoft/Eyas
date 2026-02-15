import { describe, it, expect } from 'vitest';
import path from 'path';
import { safeJoin } from '../../src/scripts/path-utils.js';

describe(`path-utils`, () => {
	describe(`safeJoin`, () => {
		const root = path.resolve(`/test/root`);

		it(`should allow valid sub-paths`, () => {
			expect(safeJoin(root, `index.html`)).toBe(path.join(root, `index.html`));
			expect(safeJoin(root, `css/style.css`)).toBe(path.join(root, `css/style.css`));
		});

		it(`should return null for path traversal attempts`, () => {
			expect(safeJoin(root, `../package.json`)).toBeNull();
			expect(safeJoin(root, `../../etc/passwd`)).toBeNull();
		});

		it(`should return null for sub-string root path bypass`, () => {
			// If root is /test/root, an attacker shouldn't reach /test/root-secrets
			expect(safeJoin(root, `../root-secrets/file.txt`)).toBeNull();
		});

		it(`should handle root-only paths`, () => {
			expect(safeJoin(root, ``)).toBe(root);
			expect(safeJoin(root, `/`)).toBe(root);
			expect(safeJoin(root, `.`)).toBe(root);
		});

		it(`should handle encoded traversal characters`, () => {
			expect(safeJoin(root, `%2e%2e%2fpackage.json`)).toBeNull();
		});
	});
});
