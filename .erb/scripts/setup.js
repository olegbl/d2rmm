/**
 * yarn setup — installs OS-level dependencies needed to run Electron.
 *
 * On Linux/WSL: installs system packages via apt-get.
 * On Windows/macOS: no system packages are needed.
 *
 * If run without sudo access, prints the command to run manually.
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');

const platform = process.platform;

// libasound2 was renamed to libasound2t64 in Ubuntu 24.04+
function getAsoundPackage() {
  const result = spawnSync('apt-cache', ['show', 'libasound2t64'], {
    stdio: 'pipe',
  });
  return result.status === 0 ? 'libasound2t64' : 'libasound2';
}

function isWSL() {
  try {
    return fs
      .readFileSync('/proc/version', 'utf8')
      .toLowerCase()
      .includes('microsoft');
  } catch {
    return false;
  }
}

const LINUX_PACKAGES = [
  'libnss3',
  'libxss1',
  'libxtst6',
  'libx11-xcb1',
  'libxcb-dri3-0',
  'libxcomposite1',
  'libxcursor1',
  'libxdamage1',
  'libxfixes3',
  'libxi6',
  'libxrandr2',
  'libxrender1',
  'fonts-liberation',
];

if (platform === 'win32') {
  console.log('Windows detected — no system dependencies needed.');
  console.log(
    'If you are developing in WSL, run `yarn setup` from within your WSL terminal instead.'
  );
  process.exit(0);
} else if (platform === 'darwin') {
  console.log('macOS detected — no system dependencies needed.');
  process.exit(0);
} else if (platform === 'linux') {
  const hasApt = spawnSync('which', ['apt-get'], { stdio: 'pipe' }).status === 0;
  if (!hasApt) {
    console.log('Non-Debian Linux detected. Please install Electron system');
    console.log(
      'dependencies manually: https://www.electronjs.org/docs/latest/development/build-instructions-linux'
    );
    process.exit(0);
  }

  const packages = [...LINUX_PACKAGES, getAsoundPackage()];
  const pkgList = packages.join(' \\\n    ');
  const isRoot =
    typeof process.getuid === 'function' && process.getuid() === 0;
  const label = isWSL() ? 'WSL/Linux' : 'Linux';

  function runInstall(withSudo) {
    const prefix = withSudo ? 'sudo ' : '';
    console.log(`${label} detected — installing Electron system dependencies...`);
    try {
      execSync(`${prefix}apt-get install -y ${packages.join(' ')}`, {
        stdio: 'inherit',
      });
      console.log('\nDone! You can now run `yarn start`.');
    } catch {
      process.exit(1);
    }
  }

  if (isRoot) {
    runInstall(false);
  } else {
    const canSudo =
      spawnSync('sudo', ['-n', 'true'], { stdio: 'pipe' }).status === 0;
    if (canSudo) {
      runInstall(true);
    } else {
      console.log(
        `${label} detected — Electron requires these system packages.`
      );
      console.log(
        'Run the following command, then re-run `yarn setup`:\n'
      );
      console.log(`  sudo apt-get install -y \\\n    ${pkgList}`);
      console.log('');
    }
  }
} else {
  console.log(`Platform "${platform}" — no setup needed.`);
}
