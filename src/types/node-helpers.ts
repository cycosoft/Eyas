import type { ResponseBody, CommandLine } from './primitives.js';

/**
 * Result of a child_process.exec call.
 */
export type ExecResult = {
	stdout: ResponseBody;
	stderr: ResponseBody;
};

/**
 * Partial result of a child_process.exec call (as seen in callbacks).
 */
export type ExecOutput = {
	stdout: ResponseBody;
};

/**
 * Callback for child_process.exec.
 */
export type ExecCallback = (error: Error | null, result: ExecOutput) => void;

/**
 * Type for the command string used in exec.
 */
export type ExecCommand = CommandLine;

/**
 * Generic type for a module with a default export.
 */
export type ModuleWithDefault<T> = {
	default: T;
};
