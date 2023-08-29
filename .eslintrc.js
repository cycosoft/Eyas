module.exports = {
	env: {
		browser: true,
		commonjs: true,
		es2021: true
	},
	sourceType: `module`,
	extends: `eslint:recommended`,
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
		"spaced-comment": [`error`, `always`]
	}
};
