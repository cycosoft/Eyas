import path from "path";

// setup
const isProd = import.meta.dirname.includes(`node_modules`);
const consumerRoot = process.cwd();
const moduleRoot = isProd
	? path.join(consumerRoot, `node_modules`, `@cycosoft`, `eyas`)
	: consumerRoot;
const eyasRoot = path.join(import.meta.dirname, `..`);
const macExecutable = `.app/`;
const configRoot = process.platform === `win32`
	? process.env.PORTABLE_EXECUTABLE_DIR || consumerRoot
	: path.join(import.meta.dirname.slice(0, import.meta.dirname.indexOf(macExecutable) + macExecutable.length), `..`);

// base paths
const roots = {
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
} as const;

// export the config for the project
export default roots;
