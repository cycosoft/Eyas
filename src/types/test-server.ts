import type { Request } from 'express';
import type { Server as HttpServer } from 'node:http';
import type { Server as HttpsServer } from 'node:https';
import type { DomainUrl, PortNumber, TimestampMS, IsVisible, FileSystemPath, CertKey, CertContent, ValidityDays, OrganizationName, CountryCode, StateName, LocalityName } from './primitives.js';

export type TestServerState = {
	url: DomainUrl;
	port: PortNumber;
	startedAt: TimestampMS;
	useHttps: IsVisible;
	customUrl?: DomainUrl;
};

export type TestServerOptions = {
	rootPath: FileSystemPath;
	useHttps?: IsVisible;
	certs?: CertBundle;
	customDomain?: DomainUrl;
};

export type CachedPorts = {
	http: PortNumber | null;
	https: PortNumber | null;
};

export type TestServer = HttpServer | HttpsServer;

export type CertOptions = {
	validityDays?: ValidityDays;
	organization?: OrganizationName;
	countryCode?: CountryCode;
	state?: StateName;
	locality?: LocalityName;
};

export type CertBundle = {
	key: CertKey;
	cert: CertContent;
};

/** Extensions for the Express Request object */
type EyasRequestExtensions = {
	_safePath?: FileSystemPath;
}

/** Extended Express Request with Eyas-specific properties */
export type EyasRequest = EyasRequestExtensions & Request;
