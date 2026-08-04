import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import pluginImport from 'eslint-plugin-import';
import { base } from '@cycosoft/eslint-config/base';
import { vue } from '@cycosoft/eslint-config/vue';
import { electron } from '@cycosoft/eslint-config/electron';
import { baseSelectors } from '@cycosoft/eslint-config/restricted-syntax';

export default tseslint.config(
	{
		// Global ignores
		ignores: [
			`dist/**`,
			`out/**`,
			`legacy-migration/**`,
			`.build/**`,
			`.pre-build/**`,
			`.test-data/**`,
			`playwright-report/**`,
			`tests/tmp/**`,
			`package-lock.json`,
			`coverage/**`
		]
	},

	...base,
	...vue,
	...electron,

	{
		// Eyas-specific globals and TS project wiring
		languageOptions: {
			globals: {
				eyas: `readonly`
			},
			parserOptions: {
				project: [`./tsconfig.node.json`, `./tsconfig.web.json`],
				tsconfigRootDir: import.meta.dirname
			}
		}
	},

	{
		// Eyas-specific rule overrides
		files: [`**/*.js`, `**/*.mjs`, `**/*.ts`, `**/*.vue`, `**/*.cjs`],
		plugins: {
			vue: pluginVue,
			import: pluginImport
		},
		rules: {
			'no-debugger': process.env.NODE_ENV === `production` ? `error` : `off`,
			'@typescript-eslint/no-var-requires': `warn`,

			'no-restricted-imports': [`error`, {
				patterns: [{
					group: [`**/../**`, `../**`],
					message: `Use path aliases (@core, @scripts, @registry, @assets, @interface, @setup, @root) instead of relative parent imports.`
				}]
			}],
			'import/no-relative-parent-imports': `warn`,

			'no-restricted-syntax': [
				`error`,
				...baseSelectors,
				{
					selector: `CallExpression[callee.name='require'][arguments.0.value='electron']`,
					message: `Do not use require('electron'). Import 'electronPath' from 'tests/e2e/eyas-utils.mjs' instead.`
				},
				{
					selector: `CallExpression[callee.property.name=/^(send|receive)$/]:matches([callee.object.name='eyas'], [callee.object.property.name='eyas']) > :matches(Literal, TemplateLiteral):first-child`,
					message: `IPC channels must be typed using 'ChannelName'. Please use a cast (e.g., 'channel-name' as ChannelName) to ensure type safety and project-wide consistency.`
				}
			]
		}
	},

	{
		// Test-specific rules
		files: [
			`**/*.test.ts`,
			`**/*.test.js`,
			`**/*.test.mjs`,
			`**/*.spec.ts`,
			`**/*.spec.js`,
			`**/*.spec.mjs`,
			`tests/**/*.ts`,
			`tests/**/*.js`,
			`tests/**/*.mjs`
		],
		rules: {
			// Warn about dynamic imports in test files - they are slower than static imports in Vitest
			'no-restricted-syntax': [
				`error`,
				...baseSelectors,
				{
					// Match: await import('...') - ImportExpression is the AST node type for import()
					selector: `AwaitExpression > ImportExpression`,
					message: `Dynamic imports are slower than static imports. Use static imports instead for better performance.`
				},
				{
					selector: `CallExpression[callee.property.name=/^(send|receive)$/]:matches([callee.object.name='eyas'], [callee.object.property.name='eyas']) > :matches(Literal, TemplateLiteral):first-child`,
					message: `IPC channels must be typed using 'ChannelName'. Please use a cast (e.g., 'channel-name' as ChannelName) to ensure type safety and project-wide consistency.`
				}
			],
			'max-lines': [`error`, 500],
			'max-lines-per-function': `off`
		}
	},

	{
		// Overrides for Declaration Files (TS requirement for quotes)
		files: [`**/*.d.ts`],
		rules: {
			quotes: `off`
		}
	},
	{
		// Exempt the centralized utility from the restricted syntax rule
		files: [`tests/e2e/eyas-utils.mjs`],
		rules: {
			'no-restricted-syntax': `off`
		}
	},
	{
		// Require TypeScript for all tests and processed script files
		files: [`src/**/*.js`, `tests/**/*.js`],
		rules: {
			'no-restricted-syntax': [
				`error`,
				{
					selector: `Program`,
					message: `Conversion in progress: please rename this file to .ts.`
				}
			]
		}
	}
);
