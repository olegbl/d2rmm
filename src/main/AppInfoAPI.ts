import type { IAppInfoAPI, GetPathParams } from 'bridge/AppInfoAPI';
import { app } from 'electron';
import path from 'path';
import { provideAPI } from './IPC';

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
      return path.join(
        process.env.USERPROFILE ?? path.join(app.getPath('home'), '..'),
        'Saved Games',
        'Diablo II Resurrected',
      );
    },
  } as IAppInfoAPI);
}
