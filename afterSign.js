const { existsSync } = require('fs');
const fs = require('fs-extra');
const path = require('path');

exports.default = async function afterSign(context) {
  const { productName, version } = context.packager.appInfo;
  const isMac = context.packager.platform.nodeName === 'darwin';

  // On macOS, files need to go inside the .app bundle at Contents/
  // since appPath = path.resolve(process.resourcesPath, '..') = D2RMM.app/Contents/
  const appContentsDir = isMac
    ? path.join(context.appOutDir, `${productName}.app`, 'Contents')
    : context.appOutDir;

  // copy the generated types.d.ts file into the app output directory
  {
    const sourceFilePath = path.join(context.outDir, 'types.d.ts');
    const targetFilePath = path.join(appContentsDir, 'types.d.ts');
    fs.writeFileSync(
      targetFilePath,
      fs
        .readFileSync(sourceFilePath, 'utf-8')
        // remove any import statements that got left behind
        .replace(/^import (.|[\n\r])*? from .*?;$/gm, ''),
      'utf-8',
    );
  }

  // copy the generated config-schema.json file into the app output directory
  {
    const sourceFilePath = path.join(context.outDir, 'config-schema.json');
    const targetFilePath = path.join(
      appContentsDir,
      'mods',
      'config-schema.json',
    );
    fs.writeFileSync(
      targetFilePath,
      fs.readFileSync(sourceFilePath, 'utf-8'),
      'utf-8',
    );
    // also copy it into dev mods dir
    if (existsSync(path.join(__dirname, 'mods'))) {
      fs.writeFileSync(
        path.join(__dirname, 'mods', 'config-schema.json'),
        fs.readFileSync(sourceFilePath, 'utf-8'),
        'utf-8',
      );
    }
  }

  // wrap the generated app in a "D2RMM X.X.X" versioned folder
  // (Windows only — on macOS the .app bundle is self-contained inside the DMG)
  if (!isMac) {
    const source = context.appOutDir;
    const intermediary = path.join(context.outDir, `${productName} ${version}`);
    const destination = path.join(
      context.appOutDir,
      `${productName} ${version}`,
    );
    fs.moveSync(source, intermediary);
    fs.moveSync(intermediary, destination);
  }
};
