import type { Viewport } from './core.js';
import type { DomainUrl, AppVersion, LabelString, IsActive, HashString, ProjectId, TestId, DurationHours, SourcePath } from './primitives.js';

export type EyasMeta = {
	expires: Date;
	gitBranch: LabelString | null;
	gitHash: HashString | null;
	gitUser: LabelString | null;
	compiled: Date;
	eyas: AppVersion;
	companyId: HashString | null;
	projectId: ProjectId | null;
	testId: TestId;
	isConfigLoaded: IsActive;
}

export type DomainConfig = {
	url: DomainUrl;
	title?: LabelString;
	key?: LabelString;
}

export type LinkConfig = {
	label: LabelString;
	url: DomainUrl;
	external?: IsActive;
}

export type OutputConfig = {
	expires: DurationHours;
}

export type ValidatedConfig = {
	source: SourcePath;
	domains: DomainConfig[];
	title: LabelString;
	version: AppVersion;
	viewports: Viewport[];
	links: LinkConfig[];
	outputs: OutputConfig;
	meta: EyasMeta;
}

export type EyasConfig = {
	source?: SourcePath;
	domain?: string | string[] | DomainConfig[];
	domains?: string | string[] | DomainConfig[];
	title?: LabelString;
	version?: AppVersion;
	viewports?: Viewport[];
	links?: LinkConfig[];
	outputs?: Partial<OutputConfig>;
	meta?: Partial<EyasMeta>;
	_isConfigLoaded?: IsActive;
}
