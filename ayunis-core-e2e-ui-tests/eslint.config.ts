import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginCypress from 'eslint-plugin-cypress';
import globals from 'globals';

export default [
	{
		files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
		languageOptions: {
			parser: tseslint.parser,
			globals: {
				...globals.node,
				...globals.es2021,
			},
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
		},
		rules: {
			...js.configs.recommended.rules,
			...tseslint.configs.recommended.rules,
		},
	},
	pluginCypress.configs.recommended,
];
