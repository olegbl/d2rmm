#!/usr/bin/env node

const { execSync } = require('child_process');

const args = process.argv.slice(2);

const hasFix = args.includes('--fix');

if (hasFix) {
  execSync('prettier --write src/', { stdio: 'inherit' });
} else {
  try {
    execSync('prettier --check src/', { stdio: 'inherit' });
  } catch (e) {
    // Prettier check failed, meaning there are formatting issues
    // We'll still run ESLint to show all issues
  }
}

execSync(
  `cross-env NODE_ENV=development eslint ./src/ --ext .js,.jsx,.ts,.tsx --cache --cache-strategy metadata ${args.join(' ')}`,
  { stdio: 'inherit' },
);
