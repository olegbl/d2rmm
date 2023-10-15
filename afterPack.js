const fs = require('fs-extra');
const path = require('path');

exports.default = async function afterPack(context) {
  const { productName, version } = context.packager.appInfo;
  const source = context.appOutDir;
  const intermediary = path.join(context.outDir, `${productName} ${version}`);
  const destination = path.join(context.appOutDir, `${productName} ${version}`);
  fs.moveSync(source, intermediary);
  fs.moveSync(intermediary, destination);
};
