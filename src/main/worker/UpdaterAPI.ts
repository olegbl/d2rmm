import { spawn } from 'child_process';
import decompress from 'decompress';
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import type { IUpdaterAPI, Update } from 'bridge/Updater';
import { CURRENT_VERSION, compareVersions } from '../version';
import {
  AppInfoAPI,
  getExecutablePath,
  getIsPackaged,
  getUserDataPath,
} from './AppInfoAPI';
import { provideAPI } from './IPC';
import { FileDestination, StringDestination, fetch } from './NetworkFetch';

const getRepoPath = () =>
  'https://api.github.com/repos/olegbl/d2rmm/releases/latest';
const getUpdatePath = () => path.join(getUserDataPath(), 'update.zip');
const getExtractedUpdatePath = () => path.join(getUserDataPath(), 'update');
const getUpdaterScriptPath = () => path.join(getUserDataPath(), 'update.ps1');

type Asset = {
  name: string;
  browser_download_url: string;
};

type Release = {
  assets: Asset[];
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

  const response = await fetch(getRepoPath(), new StringDestination());
  const release = response.toJSON<Release>();
  const releaseVersion = release.tag_name.replace(/^v/, '');

  if (compareVersions(CURRENT_VERSION, releaseVersion) > 0) {
    const asset = release.assets.find((asset) => asset.name.endsWith('.zip'));
    if (asset != null) {
      console.log('[Updater] New version available:', releaseVersion);
      return {
        version: releaseVersion,
        url: asset.browser_download_url,
      };
    }
  }

  console.log('[Updater] No updates available.');
  return null;
}

export async function installUpdate(update: Update): Promise<void> {
  await cleanupUpdate();
  await downloadUpdate(update);
  await extractUpdate();

  const appExecutablePath = getExecutablePath();
  const appDirectoryPath = path.dirname(appExecutablePath);

  const updateScriptContent = `
    Start-Sleep -Seconds 2
    Copy-Item -Path "${getExtractedUpdatePath()}\\D2RMM ${update.version}\\*" -Destination "${appDirectoryPath}" -Recurse -Force
    Start-Process -FilePath "${appExecutablePath}"
  `;

  writeFileSync(getUpdaterScriptPath(), updateScriptContent, {
    encoding: 'utf8',
  });

  const child = spawn('powershell.exe', ['-File', getUpdaterScriptPath()], {
    shell: true,
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
  await AppInfoAPI.quit();
}

async function cleanupUpdate(): Promise<void> {
  if (existsSync(getUpdatePath())) {
    rmSync(getUpdatePath());
  }
  if (existsSync(getUpdaterScriptPath())) {
    rmSync(getUpdaterScriptPath());
  }
  if (
    existsSync(getExtractedUpdatePath()) &&
    statSync(getExtractedUpdatePath()).isDirectory()
  ) {
    rmSync(getExtractedUpdatePath(), { recursive: true });
  }
}

async function downloadUpdate(update: Update): Promise<void> {
  mkdirSync(path.dirname(getUpdatePath()), { recursive: true });
  await fetch(update.url, new FileDestination(getUpdatePath()));
}

async function extractUpdate(): Promise<void> {
  process.noAsar = true;
  await decompress(getUpdatePath(), getExtractedUpdatePath());
  process.noAsar = false;
}
