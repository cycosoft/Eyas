import type { LabelString, AppVersion, DomainUrl } from '@registry/primitives.js';

export type ChangelogItem = {
	text: LabelString;
	subItems?: LabelString[];
	subItemsType?: `ordered` | `unordered`;
}

export type ChangelogEntry = {
	version: AppVersion;
	items: ChangelogItem[];
	notes?: LabelString;
	listType?: `ordered` | `unordered`;
}

export type MarkdownTextToken = {
	type: `text`;
	content: LabelString;
}

export type MarkdownCodeToken = {
	type: `code`;
	content: LabelString;
}

export type MarkdownLinkToken = {
	type: `link`;
	content: LabelString;
	url: DomainUrl;
}

export type MarkdownToken = MarkdownTextToken | MarkdownCodeToken | MarkdownLinkToken;
