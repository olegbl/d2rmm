export type ModUpdaterNexusDownload = {
  type: 'nexus';
  version: string;
  modID: string;
  fileID: number;
};

export type ModUpdaterDownload = ModUpdaterNexusDownload;

export type IModUpdaterAPI = {
  validateNexusApiKey: (nexusApiKey: string) => Promise<{
    name: string;
    email: string;
    isValid: boolean;
    isPremium: boolean;
  }>;
  getDownloadsViaNexus: (
    nexusApiKey: string,
    nexusModID: string,
  ) => Promise<ModUpdaterDownload[]>;
  installModViaNexus: (
    modID: string | null,
    nexusApiKey: string,
    nexusModID: string,
    nexusFileID: number,
    // when installing from a nxm:// link
    key?: string,
    expires?: number,
  ) => Promise<string>;
};
