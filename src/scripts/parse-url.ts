import validator from "validator";
import type { DomainUrl } from "../types/primitives.js";

const { isURL } = validator;

/**
 * Formats the URL for Electron consumption.
 * @param {DomainUrl | null | undefined} url - The input URL string to parse.
 * @returns {URL | DomainUrl} A parsed URL object or an empty string if invalid.
 */
function parseURL(url: DomainUrl | null | undefined): URL | DomainUrl {
	// config
	const output = ``;

	// exit if not a valid url
	if(!url || !isURL(url)){ return output; }

	// if the url doesn't have a protocol
	if(!/^[a-z0-9]+:\/\//.test(url)){
		// add a default protocol of https
		url = `https://${url}`;
	}

	// parse the url and send back the object
	return new URL(url);
}

export { parseURL };
