import { describe, it, expect } from 'vitest';
import { getAggregatedChanges, formatMarkdownSubset } from '@/utils/changelog-utils';

describe(`changelog-utils`, () => {
	describe(`getAggregatedChanges`, () => {
		const mockChangelog = [
			{ version: `2.0.0`, items: [{ text: `v2.0.0 change` }] },
			{ version: `1.1.0`, items: [{ text: `v1.1.0 change` }] },
			{ version: `1.0.1`, items: [{ text: `v1.0.1 change` }] },
			{ version: `1.0.0`, items: [{ text: `v1.0.0 change` }] }
		];

		it(`should return changes between two versions (inclusive of toVersion, exclusive of fromVersion)`, () => {
			const result = getAggregatedChanges(mockChangelog, `1.0.0`, `1.1.0`);
			expect(result).toHaveLength(2);
			expect(result[0].version).toBe(`1.1.0`);
			expect(result[1].version).toBe(`1.0.1`);
		});

		it(`should return all changes if fromVersion is 0.0.0`, () => {
			const result = getAggregatedChanges(mockChangelog, `0.0.0`, `1.1.0`);
			expect(result).toHaveLength(3);
		});

		it(`should handle toVersion being later than the latest in changelog`, () => {
			const result = getAggregatedChanges(mockChangelog, `1.1.0`, `3.0.0`);
			expect(result[0].version).toBe(`2.0.0`);
		});

		it(`should return an empty array if current version is already seen`, () => {
			const result = getAggregatedChanges(mockChangelog, `2.0.0`, `2.0.0`);
			expect(result).toHaveLength(0);
		});
	});

	describe(`formatMarkdownSubset`, () => {
		it(`should convert backticks to <code> tags`, () => {
			const input = `Use \`_env.url\` for navigation`;
			const output = formatMarkdownSubset(input);
			expect(output).toBe(`Use <code>_env.url</code> for navigation`);
		});

		it(`should convert markdown links to <a> tags`, () => {
			const input = `Visit [Eyas](https://eyas.dev)`;
			const output = formatMarkdownSubset(input);
			expect(output).toBe(`Visit <a href="https://eyas.dev" target="_blank" rel="noopener noreferrer">Eyas</a>`);
		});

		it(`should handle multiple links and code blocks`, () => {
			const input = `Check \`code\` and [link](url) here \`more\``;
			const output = formatMarkdownSubset(input);
			expect(output).toContain(`<code>code</code>`);
			expect(output).toContain(`<code>more</code>`);
			expect(output).toContain(`<a href="url"`);
		});

		it(`should escape HTML tags to prevent XSS`, () => {
			const input = `<b>Not Bold</b> \`code\``;
			const output = formatMarkdownSubset(input);
			expect(output).toBe(`&lt;b&gt;Not Bold&lt;/b&gt; <code>code</code>`);
		});
	});
});
