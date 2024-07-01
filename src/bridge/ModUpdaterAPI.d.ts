export type ModUpdaterNexusDownload = {
  type: 'nexus';
  version: string;
  modID: string;
  fileID: number;
};

export type ModUpdaterDownload = ModUpdaterNexusDownload;

export type IModUpdaterAPI = {
  getDownloadsViaNexus: (
    nexusApiKey: string,
    nexusModID: string,
  ) => Promise<ModUpdaterDownload[]>;
  installModViaNexus: (
    modID: string,
    nexusApiKey: string,
    nexusModID: string,
    nexusFileID: number,
    // when installing from a .nxm link
    key?: string,
    expires?: number,
  ) => Promise<void>;
};
