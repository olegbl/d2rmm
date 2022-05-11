module.exports = {
  extends: 'erb',
  rules: {
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'error',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-boolean-value': ['error', 'always'],
    'react/jsx-props-no-spreading': 'off',
    'react/require-default-props': 'off',
    'operator-assignment': ['warn', 'never'],
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
