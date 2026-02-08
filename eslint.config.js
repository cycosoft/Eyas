import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import vueEslintParser from 'vue-eslint-parser';

export default [
	{
		ignores: ['dist/**'],
		files: ['**/*.js'],
		languageOptions: {
			globals: {
				...globals.commonjs,
				// ...globals.es2021,
				eyas: 'readonly'
			},
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module'
			}
		},
		plugins: {
			vue: pluginVue
		},
		rules: {
			...pluginJs.configs.recommended.rules,
			// Existing custom rules
			'no-console': 'off', // Changed to off to allow console statements
			'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
			'no-unused-vars': 'warn',
			indent: ['error', 'tab'],
			quotes: ['error', 'backticks'],
			semi: ['error', 'always'],
			'comma-dangle': ['error', 'never'],
			'quote-props': ['error', 'as-needed'],
			'prefer-const': ['error'],
			'arrow-parens': ['error', 'as-needed'],
			'no-spaced-func': ['error'],
			'no-trailing-spaces': ['error'],
			'spaced-comment': ['error', 'always'],
			'vue/html-indent': ['error', 'tab', {
				alignAttributesVertically: false
			}],
			'vue/max-attributes-per-line': 'off'
		}
	},
	{
		files: ['**/*.vue'],
		languageOptions: {
			parser: vueEslintParser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				parser: {
					js: 'espree',
					ts: '@typescript-eslint/parser'
				}
			}
		},
		plugins: {
			vue: pluginVue
		},
		rules: {
			...pluginVue.configs['vue3-recommended'].rules
		}
	},
	{
		files: [
			'eslint.config.js',
			'src/scripts/**/*.js',
			'src/cli/index.js',
			'electron.vite.config.js',
			'src/eyas-interface/app/.vite.config.ui.js',
			'src/scripts/test-preload.js'
		],
		languageOptions: {
			globals: {
				...globals.node
			},
			parserOptions: {
				sourceType: 'script'
			}
		}
	}
];
