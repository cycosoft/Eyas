'use strict';

const certCache = new Map();

function getCacheKey(domains) {
	return Array.isArray(domains) ? domains.slice().sort().join(`,`) : String(domains);
}

async function getCerts(domains, options = {}) {
	const key = getCacheKey(domains);
	if (certCache.has(key)) {
		return certCache.get(key);
	}

	const selfsigned = require(`selfsigned`);
	const validity = options.validityDays ?? 7;

	const attrs = [
		{ name: `commonName`, value: Array.isArray(domains) ? domains[0] : domains },
		{ name: `organizationName`, value: options.organization ?? `Eyas Test Server` },
		{ name: `countryName`, value: options.countryCode ?? `US` },
		{ name: `stateOrProvinceName`, value: options.state ?? `Arizona` },
		{ name: `localityName`, value: options.locality ?? `Chandler` }
	];

	const pems = selfsigned.generate(attrs, {
		algorithm: `sha256`,
		days: validity,
		keySize: 2048,
		extensions: [
			{
				name: `basicConstraints`,
				cA: false
			},
			{
				name: `keyUsage`,
				keyCertSign: false,
				digitalSignature: true,
				keyEncipherment: true
			},
			{
				name: `subjectAltName`,
				altNames: (Array.isArray(domains) ? domains : [domains]).map(domain => {
					// Check if domain is an IP address
					if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
						return { type: 7, ip: domain }; // type 7 = IP address
					}
					return { type: 2, value: domain }; // type 2 = DNS name
				})
			}
		]
	});

	const cert = {
		key: pems.private,
		cert: pems.cert
	};

	certCache.set(key, cert);
	return cert;
}

module.exports = {
	getCerts
};
