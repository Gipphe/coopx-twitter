module.exports = {
	root: true,
	parser: '@typescript-eslint/parser',
	globals: {
		NodeJS: 'readonly',
	},
	env: {
		node: true,
	},
	plugins: [
		'@typescript-eslint',
	],
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:import/typescript',
		'eslint-config-airbnb-base',
	],
	settings: {
		'import/resolver': {
			node: {
				extensions: [
					'.js',
					'.ts',
				],
			},
		},
	},
	rules: {
		indent: ['error', 'tab'],
		'no-tabs': ['error', { allowIndentationTabs: true }],
		'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		'no-dupe-class-members': 'off',
		'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
		'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		'no-unused-expressions': 'off',
		'max-classes-per-file': 'off',
		'import/extensions': [
			'error',
			'ignorePackages',
			{
				js: 'never',
				ts: 'never',
			},
		],
		semi: 'off',
		'@typescript-eslint/semi': ['error'],
		'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.spec.ts'] }],
		'implicit-arrow-linebreak': 'off',
		'import/prefer-default-export': 'off',
		'no-console': 'off',
	},
};
