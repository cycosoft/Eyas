// format the url for electron consumption
function parseURL(url) {
	// imports
	const { isURL } = require(`validator`);

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

module.exports = { parseURL };
