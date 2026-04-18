import type { FilePath } from './primitives.js';

/**
 * Type helper for the project roots directory structure.
 */
export type ProjectRoots = {
	preBuild: FilePath;
	moduleBuild: FilePath;
	dist: FilePath;
	src: FilePath;
	eyasBuild: FilePath;
	eyasDist: FilePath;
	runners: FilePath;
	config: FilePath;
	eyas: FilePath;
	module: FilePath;
};
