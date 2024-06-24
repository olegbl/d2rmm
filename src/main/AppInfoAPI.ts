import { app } from 'electron';
import type { IAppInfoAPI, GetPathParams } from 'bridge/AppInfoAPI';
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
    quit: async () => {
      app.quit();
    },
  } as IAppInfoAPI);
}
