import type { IUpdateInstallerAPI } from 'bridge/UpdateInstallerAPI';
import type { IUpdaterAPI, Update } from 'bridge/Updater';
import decompress from 'decompress';
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import { CURRENT_VERSION, compareVersions } from '../version';
import { getExecutablePath, getIsPackaged, getTempPath } from './AppInfoAPI';
import { EventAPI } from './EventAPI';
import { consumeAPI, provideAPI } from './IPC';
import { RequestAPI } from './RequestAPI';

const UpdateInstallerAPI =
  consumeAPI<IUpdateInstallerAPI>('UpdateInstallerAPI');

type Asset = {
  name: string;
  browser_download_url: string;
};

type Release = {
  assets: Asset[];
  prerelease: boolean;
  tag_name: string;
};

export async function initUpdaterAPI(): Promise<void> {
  provideAPI('UpdaterAPI', {
    installUpdate: async (update: Update): Promise<void> => {
      await installUpdate(update);
    },
    getLatestUpdate: async (): Promise<Update | null> => {
      return await getUpdate();
    },
  } as IUpdaterAPI);
}

async function getUpdate(): Promise<Update | null> {
  if (!getIsPackaged()) {
    return null;
  }

  const appDirectoryPath = path.dirname(getExecutablePath());
  const isPreleaseEnabled =
    existsSync(path.join(appDirectoryPath, 'ENABLE_PRE_RELEASE_UPDATES')) ??
    true;
  const isSameVersionUpdateEnabled =
    existsSync(path.join(appDirectoryPath, 'ENABLE_SAME_VERSION_UPDATES')) ??
    true;

  const release =
    (isPreleaseEnabled ? await getLatestPrerelease() : null) ??
    (await getLatestRelease());
  if (release == null) {
    console.debug('[Updater] No release found.');
  } else {
    const releaseVersion = release.tag_name.replace(/^v/, '');

    const comparison = compareVersions(CURRENT_VERSION, releaseVersion);
    if (isSameVersionUpdateEnabled ? comparison >= 0 : comparison > 0) {
      const asset = release.assets.find((asset) => asset.name.endsWith('.zip'));
      if (asset != null) {
        console.log('[Updater] New version available:', releaseVersion);
        return {
          version: releaseVersion,
          url: asset.browser_download_url,
        };
      }
    }
  }

  console.log('[Updater] No updates available.');
  return null;
}

async function getLatestRelease(): Promise<Release> {
  const { response } = await RequestAPI.downloadToBuffer(
    'https://api.github.com/repos/olegbl/d2rmm/releases/latest',
  );
  return JSON.parse(response.toString()) as Release;
}

async function getLatestPrerelease(): Promise<Release | null> {
  const { response } = await RequestAPI.downloadToBuffer(
    'https://api.github.com/repos/olegbl/d2rmm/releases',
  );
  const releases = JSON.parse(response.toString()) as Release[];
  return releases.find((r) => r.prerelease) ?? null;
}

export async function installUpdate(update: Update): Promise<void> {
  const config = await getConfig();
  await cleanupUpdate(config);
  await downloadUpdate(config, update);
  await extractUpdate(config);
  await applyUpdate(config, update);
}

type Config = {
  tempDirPath: string;
  updateZipPath: string;
  updateDirPath: string;
  updateScriptPath: string;
};

async function getConfig(): Promise<Config> {
  const tempDirPath = path.join(getTempPath(), 'D2RMM', 'Updater');
  const updateDirPath = path.join(tempDirPath, 'update');
  const updateScriptPath = path.join(tempDirPath, 'update.ps1');
  return {
    tempDirPath,
    updateZipPath: '',
    updateDirPath,
    updateScriptPath,
  };
}

async function cleanupUpdate({ tempDirPath }: Config): Promise<void> {
  console.log('[Updater] Cleaning up temporary directory');
  await EventAPI.send('updater', { event: 'cleanup' });
  if (existsSync(tempDirPath) && statSync(tempDirPath).isDirectory()) {
    rmSync(tempDirPath, { recursive: true });
  }
}

async function downloadUpdate(config: Config, update: Update): Promise<void> {
  console.log('[Updater] Downloading update');
  await EventAPI.send('updater', { event: 'download' });
  const { filePath } = await RequestAPI.downloadToFile(update.url, {
    fileName: 'update.zip',
    onProgress: async ({ bytesDownloaded, bytesTotal }) => {
      await EventAPI.send('updater', {
        event: 'download-progress',
        bytesDownloaded,
        bytesTotal,
      });
    },
  });
  config.updateZipPath = filePath;
  console.log(`[Updater] Downloaded update to ${config.updateZipPath}`);
}

async function extractUpdate({
  tempDirPath,
  updateZipPath,
  updateDirPath,
}: Config): Promise<void> {
  console.log('[Updater] Extracting update');
  await EventAPI.send('updater', { event: 'extract' });
  mkdirSync(path.dirname(tempDirPath), { recursive: true });
  process.noAsar = true;
  await decompress(updateZipPath, updateDirPath);
  process.noAsar = false;
  rmSync(updateZipPath);
}

async function applyUpdate(
  { updateDirPath, updateScriptPath }: Config,
  update: Update,
): Promise<void> {
  console.log('[Updater] Applying update');
  await EventAPI.send('updater', { event: 'apply' });
  const appExecutablePath = getExecutablePath();
  const appDirectoryPath = path.dirname(appExecutablePath);
  const updateDirectoryPath = path.join(
    updateDirPath,
    `D2RMM ${update.version}`,
  );

  const updateScriptContent = `
    Write-Host "Waiting for D2RMM to exit..."
    Start-Sleep -Seconds 1

    $retries = 3
    $success = $false

    for ($i = 0; $i -lt $retries; $i++) {
        Write-Host "Copying files..."
        try {
            Copy-Item -Path "${updateDirectoryPath}\\*" -Destination "${appDirectoryPath}" -Recurse -Force -ErrorAction Stop
            $success = $true
            break
        } catch {
            Write-Host "Failed to copy files. Retrying in 5 seconds..."
            Start-Sleep -Seconds 5
        }
    }

    if (-not $success) {
        Write-Host "Failed to copy new files to D2RMM's directory. You may need to update manually."
        Read-Host "Press Enter to exit..."
        exit 1
    }

    Write-Host "Restarting D2RMM..."
    Start-Sleep -Seconds 1
    Start-Process -FilePath "${appExecutablePath}"
  `;

  writeFileSync(updateScriptPath, updateScriptContent, {
    encoding: 'utf8',
  });

  await UpdateInstallerAPI.quitAndRun(updateScriptPath);
}
