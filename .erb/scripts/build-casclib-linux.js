/**
 * Builds CascLib.dylib for linux using cmake.
 *
 * cmake must be available in PATH.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const cascLibDir = path.join(root, 'node_modules', 'CascLib');
const buildDir = path.join(cascLibDir, 'build');
const outputDylib = path.join(root, 'tools', 'CascLib.so');

execSync(
  `cmake -B "${buildDir}" -S "${cascLibDir}" -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=ON -DCMAKE_POLICY_VERSION_MINIMUM=3.5`,
  { stdio: 'inherit' },
);
execSync(`cmake --build "${buildDir}"`, { stdio: 'inherit' });

// cmake output path varies by cmake version and platform conventions.
// Check the most likely locations in order.
const candidates = [
  path.join(buildDir, 'libCasc.so'),
  path.join(buildDir, 'libcasc.so'),
  path.join(buildDir, 'casc.framework', 'Versions', '1.0.0', 'casc'),
  path.join(buildDir, 'casc.framework', 'casc'),
];

const builtLib = candidates.find((p) => fs.existsSync(p));
if (!builtLib) {
  console.error('Could not find built CascLib dylib. Searched:');
  candidates.forEach((c) => console.error(' ', c));
  process.exit(1);
}

fs.copyFileSync(builtLib, outputDylib);
console.log(`Copied ${builtLib} -> ${outputDylib}`);
