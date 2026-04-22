import { execSync } from "node:child_process";
import crypto from "node:crypto";

// Types
import type { LabelString, HashString, ProjectId } from "@registry/primitives.js";

/**
 * Attempts to return the current short hash
 * @returns The current commit hash or null
 */
export function getCommitHash(): HashString | null {
	try {
		return execSync(`git rev-parse --short HEAD`).toString().trim();
	} catch (error) {

		console.error(`Error getting commit hash:`, error);
		return null;
	}
}

/**
 * Attempts to return the current branch name
 * @returns The current branch name or null
 */
export function getBranchName(): LabelString | null {
	try {
		return execSync(`git rev-parse --abbrev-ref HEAD`).toString().trim();
	} catch (error) {

		console.error(`Error getting branch name:`, error);
		return null;
	}
}

/**
 * Attempts to return the current user name
 * @returns The current user name or null
 */
export function getUserName(): LabelString | null {
	try {
		return execSync(`git config user.name`).toString().trim();
	} catch (error) {

		console.error(`Error getting user name:`, error);
		return null;
	}
}

/**
 * Attempt to hash the user's email domain
 * @returns The hashed company ID or null
 */
export function getCompanyId(): HashString | null {
	try {
		const email = execSync(`git config user.email`).toString().trim();

		const parts = email.split(`@`);
		const domainPart = parts.at(-1);

		if (!domainPart) { return null; }

		// get the root domain of the email without subdomains
		const domain = domainPart
			.split(`.`) // split up the domain
			.slice(-2) // get the last two parts
			.join(`.`); // join them back together

		return crypto.createHash(`sha256`).update(domain).digest(`hex`);
	} catch (error) {

		console.error(`Error getting user email:`, error);
		return null;
	}
}

/**
 * Get the project id from the git remote
 * @returns The hashed project ID or null
 */
export function getProjectId(): ProjectId | null {
	try {
		// Split output into lines and filter out empty lines
		const remotes = execSync(`git remote`, { encoding: `utf-8` })
			.split(`\n`)
			.filter(file => file);

		// using the first remote, get the remote url for git
		const remoteUrl = execSync(`git remote get-url --all ${remotes[0]}`).toString().trim();

		// hash the remote url and return it
		return crypto.createHash(`sha256`).update(remoteUrl).digest(`hex`);
	} catch (error) {

		console.error(`Error getting project id:`, error);
		return null;
	}
}
