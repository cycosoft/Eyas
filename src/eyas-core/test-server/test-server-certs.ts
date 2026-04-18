import selfsigned from 'selfsigned';
import type { CertBundle, CertOptions } from '../../types/test-server.js';
import type { DomainUrl, SettingKey } from '../../types/primitives.js';

const certCache = new Map<string, CertBundle>();

function getCacheKey(domains: DomainUrl | DomainUrl[]): SettingKey {
	return Array.isArray(domains) ? domains.slice().sort().join(`,`) : String(domains);
}

export async function getCerts(domains: DomainUrl | DomainUrl[], options: CertOptions = {}): Promise<CertBundle> {
	const key = getCacheKey(domains);
	if (certCache.has(key)) {
		return certCache.get(key) as CertBundle;
	}

	const validity = options.validityDays ?? 7;
	const notAfterDate = new Date();
	notAfterDate.setDate(notAfterDate.getDate() + validity);

	const attrs = [
		{ name: `commonName`, value: Array.isArray(domains) ? domains[0] : domains },
		{ name: `organizationName`, value: options.organization ?? `Eyas Test Server` },
		{ name: `countryName`, value: options.countryCode ?? `US` },
		{ shortName: `ST`, value: options.state ?? `Arizona` },
		{ name: `localityName`, value: options.locality ?? `Chandler` }
	];

	const pems = await selfsigned.generate(attrs, {
		algorithm: `sha256`,
		notAfterDate,
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

	const cert: CertBundle = {
		key: pems.private,
		cert: pems.cert
	};

	certCache.set(key, cert);
	return cert;
}
