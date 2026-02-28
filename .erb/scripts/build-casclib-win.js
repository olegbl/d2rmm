/**
 * Builds CascLib.dll for Windows using MSBuild.
 *
 * Locates MSBuild by:
 *   1. Checking PATH (works after microsoft/setup-msbuild in CI)
 *   2. Falling back to vswhere for local dev installs
 *
 * When falling back to vswhere, also detects the installed VS version and
 * overrides PlatformToolset accordingly, so the build works regardless of
 * whether the vcxproj targets a newer toolset than what's installed.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const cascLibDir = path.join(root, 'node_modules', 'CascLib');
const vcxproj = path.join(cascLibDir, 'CascLib_dll.vcxproj');
const builtDll = path.join(
  cascLibDir,
  'bin',
  'CascLib_dll',
  'x64',
  'Release',
  'CascLib.dll',
);
const outputDll = path.join(root, 'tools', 'CascLib.dll');

// Maps VS major version → MSBuild platform toolset
const VS_TOOLSET = { 17: 'v143', 16: 'v142', 15: 'v141' };

function getMSBuildInfo() {
  // Prefer PATH — works in CI after microsoft/setup-msbuild sets it up.
  // In that environment the vcxproj toolset matches VS 2022, so no override needed.
  try {
    execSync('msbuild /version', { stdio: 'pipe' });
    return { msbuild: 'msbuild', platformToolset: null };
  } catch {
    // Fall back to vswhere for local installs
  }

  const vswhere =
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe';
  if (!fs.existsSync(vswhere)) {
    throw new Error(
      'MSBuild not found in PATH and vswhere.exe not found. ' +
        'Install Visual Studio 2017+ or add MSBuild to PATH.',
    );
  }

  const msbuildPath = execSync(
    `"${vswhere}" -latest -requires Microsoft.Component.MSBuild -find MSBuild\\**\\Bin\\MSBuild.exe`,
  )
    .toString()
    .trim();
  if (!msbuildPath) {
    throw new Error(
      'MSBuild not found via vswhere. Install Visual Studio C++ build tools.',
    );
  }

  // Detect the installed VS major version so we can set the right toolset.
  // This lets older VS installs build a vcxproj that targets a newer toolset.
  const vsVersionStr = execSync(
    `"${vswhere}" -latest -requires Microsoft.Component.MSBuild -property installationVersion`,
  )
    .toString()
    .trim();
  const vsMajor = parseInt(vsVersionStr.split('.')[0], 10);
  const platformToolset = VS_TOOLSET[vsMajor] ?? null;

  return { msbuild: `"${msbuildPath}"`, platformToolset };
}

const { msbuild, platformToolset } = getMSBuildInfo();
const toolsetArg = platformToolset ? ` /p:PlatformToolset=${platformToolset}` : '';
console.log(
  `Using MSBuild: ${msbuild}${platformToolset ? ` (toolset: ${platformToolset})` : ''}`,
);

execSync(
  `${msbuild} "${vcxproj}" /p:Configuration=Release /p:Platform=x64${toolsetArg}`,
  { stdio: 'inherit' },
);

fs.copyFileSync(builtDll, outputDll);
console.log(`Copied CascLib.dll -> ${outputDll}`);
