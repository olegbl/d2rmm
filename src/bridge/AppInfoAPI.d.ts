export type GetPathParams = Parameters<typeof Electron.app.getPath>[0];

export type IAppInfoAPI = {
  getIsPackaged(): Promise<boolean>;
  getPath(name: GetPathParams): Promise<string>;
  getResourcesPath(): Promise<string>;
  getDirname(): Promise<string>;
  quit(): Promise<void>;
};
