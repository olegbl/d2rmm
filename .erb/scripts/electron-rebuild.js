import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
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
  const electronPkgPath = path.join(
    __dirname,
    '../../node_modules/electron/package.json'
  );
  const electronVersion = JSON.parse(
    fs.readFileSync(electronPkgPath, 'utf8')
  ).version;
  execSync(
    `${cmd} --parallel --force --types prod,dev,optional --module-dir . --version ${electronVersion}`,
    {
      cwd: webpackPaths.appPath,
      stdio: 'inherit',
    }
  );
}
