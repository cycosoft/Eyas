import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import vueEslintParser from 'vue-eslint-parser';
import pluginImport from 'eslint-plugin-import';

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
			`playwright-report/**`
		]
	},

	// Base JS configuration
	pluginJs.configs.recommended,

	{
		// Global Language Options
		languageOptions: {
			globals: {
				...globals.commonjs,
				...globals.browser,
				...globals.node,
				eyas: `readonly`
			},
			parserOptions: {
				ecmaVersion: `latest`,
				sourceType: `module`
			}
		}
	},

	// TypeScript Configurations
	...tseslint.configs.recommended.map(config => ({
		...config,
		files: [`**/*.ts`, `**/*.vue`]
	})),

	// Vue Configurations
	...pluginVue.configs[`flat/recommended`].map(config => ({
		...config,
		files: [`**/*.vue`]
	})),

	{
		// TypeScript and Vue parser setup
		files: [`**/*.ts`, `**/*.vue`],
		languageOptions: {
			parser: vueEslintParser,
			parserOptions: {
				parser: tseslint.parser,
				sourceType: `module`,
				extraFileExtensions: [`.vue`]
			}
		}
	},

	{
		// Global Plugins and Rules
		plugins: {
			vue: pluginVue,
			'@typescript-eslint': tseslint.plugin,
			import: pluginImport
		},
		rules: {
			// Basic Rules
			'no-console': `off`,
			'no-debugger': process.env.NODE_ENV === `production` ? `error` : `off`,
			'no-unused-vars': `off`, // Handled by @typescript-eslint version
			'no-redeclare': `off`, // Can be noisy with globals in separate configs

			// TS specific rule overrides
			'@typescript-eslint/no-unused-vars': [`warn`, {
				argsIgnorePattern: `^_`,
				varsIgnorePattern: `^_`
			}],
			'@typescript-eslint/no-explicit-any': `error`, // No more "cheating" with any
			'@typescript-eslint/no-require-imports': `warn`,
			'@typescript-eslint/no-var-requires': `warn`,
			'@typescript-eslint/consistent-type-definitions': [`error`, `interface`],

			// Import Rules
			'import/no-commonjs': `error`,
			'import/extensions': [`error`, `always`, {
				ignorePackages: true,
				ts: `never`,
				tsx: `never`,
				js: `always`
			}],

			// Formatting Rules (User Preference: Tabs, Backticks, Always Semi)
			indent: [`error`, `tab`],
			quotes: [`error`, `backtick`],
			semi: [`error`, `always`],
			'comma-dangle': [`error`, `never`],
			'quote-props': [`error`, `as-needed`],
			'prefer-const': [`error`],
			'arrow-parens': [`error`, `as-needed`],
			'no-spaced-func': [`error`],
			'no-trailing-spaces': [`error`],
			'spaced-comment': [`error`, `always`],

			// Restrict require('electron') with a helpful message
			'no-restricted-syntax': [
				`error`,
				{
					selector: `CallExpression[callee.name='require'][arguments.0.value='electron']`,
					message: `Do not use require('electron'). Import 'electronPath' from 'tests/e2e/eyas-utils.mjs' instead.`
				},
				{
					selector: `ImportDeclaration[source.type='TemplateLiteral']`,
					message: `Static imports must use standard quotes (single or double), not backticks.`
				},
				{
					selector: `Identifier[name='__dirname']`,
					message: `__dirname is not defined in ESM. Use import.meta.url or a helper instead.`
				}
			],

			// Vue Specific Formatting
			'vue/html-indent': [`error`, `tab`, {
				alignAttributesVertically: false
			}],
			'vue/max-attributes-per-line': `off`,
			'vue/multi-word-component-names': `off`
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
