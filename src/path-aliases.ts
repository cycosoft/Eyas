import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(currentDir, `..`);

/**
 * Common path aliases used across the entire project (Core, Scripts, Registry, Assets).
 */
export const commonAliases = {
	'@core': resolve(root, `src/eyas-core`),
	'@scripts': resolve(root, `src/scripts`),
	'@registry': resolve(root, `src/types`),
	'@assets': resolve(root, `src/eyas-assets`),
	'@setup': resolve(root, `tests/setup`),
	'@root': root
};

/**
 * Renderer-specific aliases, extending common ones with UI-specific paths.
 */
export const rendererAliases = {
	...commonAliases,
	'@': resolve(root, `src/eyas-interface/app/src`),
	'@interface': resolve(root, `src/eyas-interface/app/src`)
};
