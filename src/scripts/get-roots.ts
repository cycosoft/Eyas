import path from "path";
import type { SourcePath, IsActive } from "../types/primitives.js";

// setup
const isProd: IsActive = import.meta.dirname.includes(`node_modules`);
const consumerRoot: SourcePath = process.cwd();
const moduleRoot: SourcePath = isProd
	? path.join(consumerRoot, `node_modules`, `@cycosoft`, `eyas`)
	: consumerRoot;
const eyasRoot: SourcePath = path.join(import.meta.dirname, `..`);
const macExecutable = `.app/`;
const configRoot: SourcePath = process.platform === `win32`
	? process.env.PORTABLE_EXECUTABLE_DIR || consumerRoot
	: path.join(import.meta.dirname.slice(0, import.meta.dirname.indexOf(macExecutable) + macExecutable.length), `..`);

type Roots = {
	preBuild: SourcePath;
	moduleBuild: SourcePath;
	dist: SourcePath;
	src: SourcePath;
	eyasBuild: SourcePath;
	eyasDist: SourcePath;
	runners: SourcePath;
	config: SourcePath;
	eyas: SourcePath;
	module: SourcePath;
}

// base paths
const roots: Roots = {
	preBuild: path.join(moduleRoot, `.pre-build`),
	moduleBuild: path.join(moduleRoot, `.build`),
	dist: path.join(moduleRoot, `dist`),
	src: path.join(moduleRoot, `src`),
	eyasBuild: path.join(consumerRoot, `.eyas-preview`),
	eyasDist: path.join(consumerRoot, `eyas-dist`),
	runners: path.join(consumerRoot, `.runners`),
	config: configRoot === `/` ? consumerRoot : configRoot,
	eyas: eyasRoot,
	module: moduleRoot
};

// export the config for the project
export default roots;
