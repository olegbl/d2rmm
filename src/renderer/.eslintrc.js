module.exports = {
  rules: {
    'no-relative-import-paths/no-relative-import-paths': [
      'warn',
      { allowSameFolder: false, rootDir: 'src', prefix: '' },
    ],
  },
  plugins: ['no-relative-import-paths'],
};
