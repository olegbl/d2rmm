import { spawn } from 'child_process';
import decompress from 'decompress';
import { BrowserWindow, app, ipcMain } from 'electron';
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import { FileDestination, StringDestination, fetch } from './downloader';
import { CURRENT_VERSION, compareVersions } from './version';

const REPO_PATH = 'https://api.github.com/repos/olegbl/d2rmm/releases/latest';
const UPDATE_PATH = path.join(app.getPath('userData'), 'update.zip');
const EXTRACTED_UPDATE_PATH = path.join(app.getPath('userData'), 'update');
const UPDATER_SCRIPT_PATH = path.join(app.getPath('userData'), 'update.ps1');

type Asset = {
  name: string;
  browser_download_url: string;
};

type Release = {
  assets: Asset[];
  tag_name: string;
};

type Update = {
  version: string;
  url: string;
};

let latestUpdate: Update | null = null;

ipcMain.on('install-update', installLatestUpdate);

export function checkForUpdates(mainWindow: BrowserWindow): void {
  if (!app.isPackaged) {
    return;
  }

  getUpdate()
    .then((update) => {
      latestUpdate = update;
      if (update != null) {
        mainWindow.webContents.send('update-available', update.version);
      }
    })
    .catch(console.error);
}

async function getUpdate(): Promise<Update | null> {
  const response = await fetch(REPO_PATH, new StringDestination());
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

export async function installLatestUpdate(): Promise<void> {
  if (latestUpdate != null) {
    await installUpdate(latestUpdate);
  }
}

export async function installUpdate(update: Update): Promise<void> {
  await cleanupUpdate();
  await downloadUpdate(update);
  await extractUpdate();

  const appExecutablePath = app.getPath('exe');
  const appDirectoryPath = path.dirname(appExecutablePath);

  const updateScriptContent = `
    Start-Sleep -Seconds 2
    Copy-Item -Path "${EXTRACTED_UPDATE_PATH}\\D2RMM ${update.version}\\*" -Destination "${appDirectoryPath}" -Recurse -Force
    Start-Process -FilePath "${appExecutablePath}"
  `;

  writeFileSync(UPDATER_SCRIPT_PATH, updateScriptContent, { encoding: 'utf8' });

  const child = spawn('powershell.exe', ['-File', UPDATER_SCRIPT_PATH], {
    shell: true,
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
  app.quit();
}

async function cleanupUpdate(): Promise<void> {
  if (existsSync(UPDATE_PATH)) {
    rmSync(UPDATE_PATH);
  }
  if (existsSync(UPDATER_SCRIPT_PATH)) {
    rmSync(UPDATER_SCRIPT_PATH);
  }
  if (
    existsSync(EXTRACTED_UPDATE_PATH) &&
    statSync(EXTRACTED_UPDATE_PATH).isDirectory()
  ) {
    rmSync(EXTRACTED_UPDATE_PATH, { recursive: true });
  }
}

async function downloadUpdate(update: Update): Promise<void> {
  mkdirSync(path.dirname(UPDATE_PATH), { recursive: true });
  await fetch(update.url, new FileDestination(UPDATE_PATH));
}

async function extractUpdate(): Promise<void> {
  process.noAsar = true;
  await decompress(UPDATE_PATH, EXTRACTED_UPDATE_PATH);
  process.noAsar = false;
}
