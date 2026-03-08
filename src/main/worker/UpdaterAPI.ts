import type { IUpdateInstallerAPI } from 'bridge/UpdateInstallerAPI';
import type { IUpdaterAPI, Update } from 'bridge/Updater';
import decompress from 'decompress';
import { existsSync, mkdirSync, rmSync, statSync } from 'fs';
import path from 'path';
import { tl } from '../../shared/i18n';
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
    console.debug(tl('updater.log.noRelease'));
  } else {
    const releaseVersion = release.tag_name.replace(/^v/, '');

    const comparison = compareVersions(CURRENT_VERSION, releaseVersion);
    if (isSameVersionUpdateEnabled ? comparison >= 0 : comparison > 0) {
      const asset = release.assets.find((asset) => asset.name.endsWith('.zip'));
      if (asset != null) {
        console.log(tl('updater.log.newVersion', { version: releaseVersion }));
        return {
          version: releaseVersion,
          url: asset.browser_download_url,
        };
      }
    }
  }

  console.log(tl('updater.log.noUpdates'));
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
  try {
    const config = await getConfig();
    await cleanupUpdate(config);
    await downloadUpdate(config, update);
    await extractUpdate(config);
    await applyUpdate(config, update);
  } catch (e) {
    await EventAPI.send('updater', { event: 'error', message: String(e) });
    throw e;
  }
}

type Config = {
  tempDirPath: string;
  updateZipPath: string;
  updateDirPath: string;
};

async function getConfig(): Promise<Config> {
  const tempDirPath = path.join(getTempPath(), 'D2RMM', 'Updater');
  const randomId = Math.random().toString(36).slice(2, 10);
  const updateDirPath = path.join(tempDirPath, 'update', randomId);
  return {
    tempDirPath,
    updateZipPath: '',
    updateDirPath,
  };
}

async function cleanupUpdate({ tempDirPath }: Config): Promise<void> {
  console.log(tl('updater.log.cleanup'));
  await EventAPI.send('updater', { event: 'cleanup' });
  if (existsSync(tempDirPath) && statSync(tempDirPath).isDirectory()) {
    try {
      rmSync(tempDirPath, { recursive: true });
    } catch (e) {
      // If we fail to clean up the "update" directory, that's okay
      // because we'll be creating a new random directory inside
      // so there shouldn't be any chance of a collision. We just
      // want to delete it to clean things up and reduce disk space
      // used.
      console.warn(tl('updater.log.cleanupFailed'), e);
    }
  }
}

async function downloadUpdate(config: Config, update: Update): Promise<void> {
  console.log(tl('updater.log.downloading'));
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
  console.log(tl('updater.log.downloaded', { path: config.updateZipPath }));
}

async function extractUpdate({
  tempDirPath,
  updateZipPath,
  updateDirPath,
}: Config): Promise<void> {
  console.log(tl('updater.log.extracting'));
  await EventAPI.send('updater', { event: 'extract' });
  mkdirSync(path.dirname(tempDirPath), { recursive: true });
  process.noAsar = true;
  await decompress(updateZipPath, updateDirPath);
  process.noAsar = false;
  rmSync(updateZipPath);
}

async function applyUpdate(
  { updateDirPath }: Config,
  update: Update,
): Promise<void> {
  console.log(tl('updater.log.applying'));
  await EventAPI.send('updater', { event: 'apply' });
  const appExecutablePath = getExecutablePath();
  const appDirectoryPath = path.dirname(appExecutablePath);
  const updateDirectoryPath = path.join(
    updateDirPath,
    `D2RMM ${update.version}`,
  );
  const updaterExecutablePath = path.join(
    updateDirectoryPath,
    'tools',
    process.platform === 'darwin' ? 'updater' : 'updater.exe',
  );
  await UpdateInstallerAPI.quitAndRun(updaterExecutablePath, [
    updateDirectoryPath,
    appDirectoryPath,
    appExecutablePath,
  ]);
}
