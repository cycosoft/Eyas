import { describe, it, expect } from 'vitest';
import { getAggregatedChanges, tokenizeMarkdownSubset } from '@/utils/changelog-utils';

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

	describe(`tokenizeMarkdownSubset`, () => {
		it(`should convert backticks to code tokens`, () => {
			const input = `Use \`_env.url\` for navigation`;
			const output = tokenizeMarkdownSubset(input);
			expect(output).toEqual([
				{ type: `text`, content: `Use ` },
				{ type: `code`, content: `_env.url` },
				{ type: `text`, content: ` for navigation` }
			]);
		});

		it(`should convert markdown links to link tokens`, () => {
			const input = `Visit [Eyas](https://eyas.dev)`;
			const output = tokenizeMarkdownSubset(input);
			expect(output).toEqual([
				{ type: `text`, content: `Visit ` },
				{ type: `link`, content: `Eyas`, url: `https://eyas.dev` }
			]);
		});

		it(`should handle multiple links and code blocks`, () => {
			const input = `Check \`code\` and [link](url) here \`more\``;
			const output = tokenizeMarkdownSubset(input);
			expect(output).toEqual([
				{ type: `text`, content: `Check ` },
				{ type: `code`, content: `code` },
				{ type: `text`, content: ` and ` },
				{ type: `link`, content: `link`, url: `url` },
				{ type: `text`, content: ` here ` },
				{ type: `code`, content: `more` }
			]);
		});

		it(`should NOT escape HTML tags (Vue handles it)`, () => {
			const input = `<b>Not Bold</b> \`code\``;
			const output = tokenizeMarkdownSubset(input);
			expect(output[0].content).toBe(`<b>Not Bold</b> `);
		});
	});
});
