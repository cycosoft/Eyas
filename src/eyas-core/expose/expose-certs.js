'use strict';

const path = require(`path`);
const fs = require(`fs`);
const { execSync } = require(`child_process`);
let caCache = null;
const certCache = new Map();

function getCacheKey(domains) {
	return Array.isArray(domains) ? domains.slice().sort().join(`,`) : String(domains);
}

async function getCerts(domains, options = {}) {
	const key = getCacheKey(domains);
	if (certCache.has(key)) {
		return certCache.get(key);
	}
	const mkcert = require(`mkcert`);
	const validity = options.validityDays ?? 7;

	if (!caCache) {
		caCache = await mkcert.createCA({
			organization: options.organization ?? `Eyas Test Server`,
			countryCode: options.countryCode ?? `US`,
			state: options.state ?? `Arizona`,
			locality: options.locality ?? `Chandler`,
			validity
		});
	}

	const cert = await mkcert.createCert({
		ca: caCache,
		domains: Array.isArray(domains) ? domains : [domains],
		validity
	});
	certCache.set(key, cert);
	return cert;
}

function isCaInstalled() {
	try {
		const caroot = execSync(`mkcert -CAROOT`, { encoding: `utf8` }).trim();
		if (!caroot) return false;
		const rootCert = path.join(caroot, `rootCA.pem`);
		return fs.existsSync(rootCert);
	} catch {
		return false;
	}
}

module.exports = {
	getCerts,
	isCaInstalled
};
