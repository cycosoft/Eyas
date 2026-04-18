export type EyasMeta = {
	expires: Date;
	gitBranch: string | null;
	gitHash: string | null;
	gitUser: string | null;
	compiled: Date;
	eyas: string;
	companyId: string | null;
	projectId: string | null;
	testId: string;
	isConfigLoaded: boolean;
}

export type ValidatedConfig = {
	source: string;
	domains: { url: string; title?: string; key?: string }[];
	title: string;
	version: string;
	viewports: { label: string; width: number; height: number; isDefault?: boolean }[];
	links: { label: string; url: string; external?: boolean }[];
	outputs: {
		expires: number;
	};
	meta: EyasMeta;
}

export type EyasConfig = {
	source?: string;
	domain?: string | string[] | { url: string; title?: string }[];
	domains?: string | string[] | { url: string; title?: string }[];
	title?: string;
	version?: string;
	viewports?: { label: string; width: number; height: number; isDefault?: boolean }[];
	links?: { label: string; url: string; external?: boolean }[];
	outputs?: {
		expires?: number;
	};
	meta?: Partial<EyasMeta>;
	_isConfigLoaded?: boolean;
}
