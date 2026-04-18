import path from "path";
import type { SourcePath } from "../types/primitives.js";

/**
 * Joins a root path with a sub-path and ensures the result is within the root.
 * Returns the resolved path or null if a traversal attempt is detected.
 * @param {SourcePath} root - The base directory
 * @param {SourcePath} subPath - The relative path to join
 * @returns {SourcePath | null}
 */
function safeJoin(root: SourcePath, subPath: SourcePath | null | undefined): SourcePath | null {
	if (!root) { return null; }
	if (!subPath) { return path.resolve(root); }

	// Decode any URL-encoded characters (e.g., %2e%2e%2f -> ../)
	let decodedSubPath: SourcePath = subPath;
	try {
		decodedSubPath = decodeURIComponent(subPath);
	} catch {
		// If decoding fails, continue with original subPath
	}

	// Resolve the absolute path
	const rootResolved = path.resolve(root);
	const joinedPath = path.join(rootResolved, decodedSubPath);
	const resolvedPath = path.resolve(joinedPath);

	// Ensure the resolved path is within the root
	// We append a path separator to ensure /test/root-secrets doesn't match /test/root
	const rootWithTrailingSlash = rootResolved.endsWith(path.sep)
		? rootResolved
		: rootResolved + path.sep;

	if (resolvedPath === rootResolved || resolvedPath.startsWith(rootWithTrailingSlash)) {
		return resolvedPath;
	}

	return null;
}

export { safeJoin };
