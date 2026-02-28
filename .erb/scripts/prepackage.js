/**
 * Runs before `npm run package` to build platform-specific binaries
 * that are not checked into the repository:
 *   - updater executable (updater.exe / updater)
 *   - CascLib shared library (CascLib.dll / CascLib.dylib)
 */
const { execSync } = require('child_process');

const isWin = process.platform === 'win32';

function run(script) {
  execSync(`npm run ${script}`, { stdio: 'inherit' });
}

run(isWin ? 'build:updater:win' : 'build:updater:mac');
run(isWin ? 'build:casclib:win' : 'build:casclib:mac');
