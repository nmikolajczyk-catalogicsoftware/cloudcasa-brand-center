import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['**/node_modules/**', '**/playwright-report/**', '**/test-results/**'] },
  js.configs.recommended,
  {
    rules: {
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-implicit-globals': 'error',
      'no-console': 'error',
    },
  },
  // Code that ships to the browser
  { files: ['assets/js/**/*.js'], languageOptions: { sourceType: 'script', globals: globals.browser } },
  // Node tooling and Playwright specs
  {
    files: ['tests/**/*.mjs', 'tools/*.mjs'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-console': 'off' },
  },
];
