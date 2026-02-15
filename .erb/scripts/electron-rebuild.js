import { execSync } from 'child_process';
import fs from 'fs';
import { dependencies } from '../../release/app/package.json';
import webpackPaths from '../configs/webpack.paths';

if (
  Object.keys(dependencies || {}).length > 0 &&
  fs.existsSync(webpackPaths.appNodeModulesPath)
) {
  const electronRebuildBin =
    '../../node_modules/.bin/electron-rebuild';
  const cmd =
    process.platform === 'win32'
      ? electronRebuildBin.replace(/\//g, '\\')
      : electronRebuildBin;
  execSync(`${cmd} --parallel --force --types prod,dev,optional --module-dir .`, {
    cwd: webpackPaths.appPath,
    stdio: 'inherit',
  });
}
