import js from '@eslint/js';
import configPrettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['node_modules', 'test-results', 'playwright-report', 'blob-report']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended, configPrettier],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // Node for the runner/config; browser for the in-page `page.evaluate`
      // callbacks that reference `window`/`document`.
      globals: { ...globals.node, ...globals.browser },
    },
  },
]);
