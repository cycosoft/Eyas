import type { Server as HttpServer } from 'node:http';
import type { Server as HttpsServer } from 'node:https';

export interface TestServerState {
	url: string;
	port: number;
	startedAt: number;
	useHttps: boolean;
	customUrl?: string;
}

export interface TestServerOptions {
	rootPath: string;
	useHttps?: boolean;
	certs?: {
		key: string;
		cert: string;
	};
	customDomain?: string;
}

export interface CachedPorts {
	http: number | null;
	https: number | null;
}

export type TestServer = HttpServer | HttpsServer;

export interface CertOptions {
	validityDays?: number;
	organization?: string;
	countryCode?: string;
	state?: string;
	locality?: string;
}

export interface CertBundle {
	key: string;
	cert: string;
}
