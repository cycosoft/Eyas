module.exports = {
	env: {
		browser: true,
		commonjs: true,
		es2021: true
	},
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
		indent: [`warn`, `tab`],
		quotes: [`error`, `backtick`],
		semi: [`error`, `always`],
		'comma-dangle': [`error`, `never`],
		'quote-props': [`error`, `as-needed`]
	}
};
