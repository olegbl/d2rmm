'use strict';

const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const importPlugin = require('eslint-plugin-import');
const noRelativeImportPaths = require('eslint-plugin-no-relative-import-paths');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = tseslint.config(
  // Files to skip entirely
  {
    ignores: [
      // project build/output dirs
      'docs/**',
      'mods/**',
      'mods.empty/**',
      'release/**',
      'build/**',
      'dist/**',
      // dot dirs (tools, IDE, CI)
      '.erb/**',
      '.git/**',
      '.github/**',
      '.claude/**',
      '.vscode/**',
      '.husky/**',
      // generated CSS type files
      '**/*.css.d.ts',
      '**/*.scss.d.ts',
      '**/*.sass.d.ts',
      // misc
      '**/third-party/**',
    ],
  },

  // ESLint + TypeScript recommended rules
  js.configs.recommended,
  tseslint.configs.recommended,

  // Project-wide rules for all JS/TS source files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    settings: {
      'import/resolver': {
        typescript: {},
        node: {},
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
    rules: {
      // react-hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // disabled
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
      'no-inner-declarations': 'off',
      // customized
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'all',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_.*$',
          argsIgnorePattern: '^_.*$',
          caughtErrorsIgnorePattern: '^_.*$',
        },
      ],
      'import/no-unresolved': 'error',
      'react/jsx-boolean-value': ['error', 'always'],
      'react/jsx-sort-props': [
        'error',
        {
          callbacksLast: false,
          shorthandFirst: false,
          shorthandLast: false,
          multiline: 'ignore',
          ignoreCase: true,
          noSortAlphabetically: false,
          reservedFirst: true,
        },
      ],
    },
  },

  // Renderer-specific: enforce non-relative imports
  {
    files: ['src/renderer/**/*.{ts,tsx,js,jsx}'],
    plugins: {
      'no-relative-import-paths': noRelativeImportPaths,
    },
    rules: {
      'no-relative-import-paths/no-relative-import-paths': [
        'warn',
        { allowSameFolder: false, rootDir: 'src', prefix: '' },
      ],
    },
  },

  // Disable ESLint formatting rules that conflict with prettier
  prettier,
);
