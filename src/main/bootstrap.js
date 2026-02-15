// Bootstrap file to load ts-node before main.ts
// This is needed because Electron 28's ESM loader doesn't work with ts-node's register hook

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
  },
});

require('./main.ts');
