module.exports = {
  extends: 'erb',
  rules: {
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'error',
    'import/prefer-default-export': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-boolean-value': ['error', 'always'],
    'react/jsx-props-no-spreading': 'off',
    'react/require-default-props': 'off',
    'react/destructuring-assignment': 'off',
    'operator-assignment': ['warn', 'never'],
    'no-await-in-loop': 'off',
    'no-continue': 'off',
    'no-inner-declarations': 'off',
    'no-plusplus': 'off',
    'no-restricted-syntax': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
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
    '@typescript-eslint/return-await': 'off',
    'prefer-destructuring': 'off',
    'no-console': 'off',
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
  },
  settings: {
    'import/resolver': {
      // See https://github.com/benmosher/eslint-plugin-import/issues/1396#issuecomment-575727774 for line below
      node: {},
      webpack: {
        config: require.resolve('./.erb/configs/webpack.config.eslint.ts'),
      },
      typescript: {},
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
};
