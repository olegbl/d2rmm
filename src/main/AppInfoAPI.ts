import type { IAppInfoAPI, GetPathParams } from 'bridge/AppInfoAPI';
import { app } from 'electron';
import path from 'path';
import { provideAPI } from './IPC';

function getAppPath() {
  return app.isPackaged
    ? path.resolve(process.resourcesPath, '..')
    : path.resolve(__dirname, '..', '..');
}

function isSteamDeck() {
  const appPath = getAppPath();
  // TODO: clean this up
  return (
    appPath.startsWith('Z:\\home\\deck\\') ||
    appPath.startsWith('\\home\\deck\\')
  );
}

export async function initAppInfoAPI(): Promise<void> {
  provideAPI('AppInfoAPI', {
    getIsPackaged: async () => {
      return app.isPackaged;
    },
    getPath: async (name: GetPathParams) => {
      return app.getPath(name);
    },
    getResourcesPath: async () => {
      return process.resourcesPath;
    },
    getDirname: async () => {
      return __dirname;
    },
    getBaseSavesPath: async () => {
      // Steam Deck: /home/deck/.local/share/Steam/steamapps/compatdata/2536520/pfx/drive_c/users/steamuser/Saved Games/Diablo II Resurrected/
      if (isSteamDeck()) {
        return path.join(
          'home',
          'deck',
          '.local',
          'share',
          'Steam',
          'steamapps',
          'compatdata',
          '2536520',
          'pfx',
          'drive_c',
          'users',
          'steamuser',
          'Saved Games',
          'Diablo II Resurrected',
        );
      }

      // Windows: C:\Users\<username>\Saved Games\Diablo II Resurrected
      return path.join(
        process.env.USERPROFILE ?? path.join(app.getPath('home'), '..'),
        'Saved Games',
        'Diablo II Resurrected',
      );
    },
    getAppPath: async () => {
      return getAppPath();
    },
  } as IAppInfoAPI);
}
