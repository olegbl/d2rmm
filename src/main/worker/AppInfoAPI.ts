import path from 'path';
import type { IAppInfoAPI } from 'bridge/AppInfoAPI';
import { consumeAPI } from './IPC';

export const AppInfoAPI = consumeAPI<IAppInfoAPI>('AppInfoAPI');

type CachedAppInfo = {
  appPath: string;
  executablePath: string;
  homePath: string;
  isPackaged: boolean;
  resourcesPath: string;
  tempPath: string;
  userDataPath: string;
};

let CACHED_APP_INFO: CachedAppInfo;

export async function initAppInfoAPI(): Promise<void> {
  const isPackaged = await AppInfoAPI.getIsPackaged();
  const homePath = await AppInfoAPI.getPath('home');
  const userDataPath = await AppInfoAPI.getPath('userData');
  const tempPath = await AppInfoAPI.getPath('temp');
  const executablePath = await AppInfoAPI.getPath('exe');
  const dirname = await AppInfoAPI.getDirname();
  const resourcesPath = await AppInfoAPI.getResourcesPath();
  const appPath = isPackaged
    ? path.join(resourcesPath, '../')
    : path.join(dirname, '../../');

  CACHED_APP_INFO = {
    appPath,
    executablePath,
    homePath,
    isPackaged,
    resourcesPath,
    tempPath,
    userDataPath,
  };
}

export function getIsPackaged(): boolean {
  return CACHED_APP_INFO.isPackaged;
}

export function getHomePath(): string {
  return CACHED_APP_INFO.homePath;
}

export function getUserDataPath(): string {
  return CACHED_APP_INFO.userDataPath;
}

export function getExecutablePath(): string {
  return CACHED_APP_INFO.executablePath;
}

export function getAppPath(): string {
  return CACHED_APP_INFO.appPath;
}

export function getResourcesPath(): string {
  return CACHED_APP_INFO.resourcesPath;
}

export function getTempPath(): string {
  return CACHED_APP_INFO.tempPath;
}
