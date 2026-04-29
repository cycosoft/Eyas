import type { LabelString, AppVersion, DomainUrl } from '@registry/primitives.js';

type ChangelogItem = {
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

type MarkdownTextToken = {
	type: `text`;
	content: LabelString;
}

type MarkdownCodeToken = {
	type: `code`;
	content: LabelString;
}

type MarkdownLinkToken = {
	type: `link`;
	content: LabelString;
	url: DomainUrl;
}

export type MarkdownToken = MarkdownTextToken | MarkdownCodeToken | MarkdownLinkToken;
