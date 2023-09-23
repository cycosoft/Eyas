module.exports = {
	env: {
		browser: true,
		commonjs: true,
		es2021: true
	},
	extends: [
		`eslint:recommended`,
		`plugin:vue/vue3-recommended`
	],
	overrides: [
		{
			env: {
				node: true
			},
			files: [
				`.eslintrc.{js,cjs}`
			],
			parserOptions: {
				sourceType: `script`
			}
		}
	],
	parserOptions: {
		sourceType: `module`,
		ecmaVersion: `latest`
	},
	rules: {
		'no-console': process.env.NODE_ENV === `production` ? `error` : `warn`,
		'no-debugger': process.env.NODE_ENV === `production` ? `error` : `off`,
		'no-unused-vars': `warn`,
		indent: [`error`, `tab`],
		quotes: [`error`, `backtick`],
		semi: [`error`, `always`],
		'comma-dangle': [`error`, `never`],
		'quote-props': [`error`, `as-needed`],
		'prefer-const': [`error`],
		'arrow-parens': [`error`, `as-needed`],
		'no-spaced-func': [`error`],
		'no-trailing-spaces': [`error`],
		"spaced-comment": [`error`, `always`],
		"vue/html-indent": [`error`, `tab`, {
			alignAttributesVertically: false
		}]
	}
};
