export type IShellAPI = {
  openExternal: (url: string) => Promise<void>;
};
