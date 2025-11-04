export type IShellAPI = {
  openExternal: (url: string) => Promise<void>;
  showItemInFolder: (path: string) => Promise<void>;
};
