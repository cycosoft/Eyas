export interface ChangelogItem {
	text: string;
	subItems?: string[];
	subItemsType?: `ordered` | `unordered`;
}

export interface ChangelogEntry {
	version: string;
	items: ChangelogItem[];
	notes?: string;
	listType?: `ordered` | `unordered`;
}

export type MarkdownToken =
	| { type: `text`; content: string }
	| { type: `code`; content: string }
	| { type: `link`; content: string; url: string };
