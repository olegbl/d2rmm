const fs = require('fs-extra');
const path = require('path');

exports.default = async function afterSign(context) {
  // move the generated types.d.ts file into the app output directory
  const sourceFilePath = path.join(context.outDir, 'types.d.ts');
  const targetFilePath = path.join(context.appOutDir, 'types.d.ts');
  fs.writeFileSync(
    targetFilePath,
    fs
      .readFileSync(sourceFilePath, 'utf-8')
      // remove any import statements that got left behind
      .replace(/^import (.|[\n\r])*? from .*?;$/gm, ''),
    'utf-8',
  );

  // wrap the generated app in a "D2RMM X.X.X" versioned folder
  const { productName, version } = context.packager.appInfo;
  const source = context.appOutDir;
  const intermediary = path.join(context.outDir, `${productName} ${version}`);
  const destination = path.join(context.appOutDir, `${productName} ${version}`);
  fs.moveSync(source, intermediary);
  fs.moveSync(intermediary, destination);
};
