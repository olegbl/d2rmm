import type { ModConfigValue } from './ModConfigValue';
import type {
  CollectionRevision,
  ICollectionPayload,
  MyCollection,
} from './NexusModsAPI';

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
  installModFromZip: (zipFilePath: string) => Promise<string>;
  installModFromFolder: (folderPath: string) => Promise<string>;
  getCollectionRevision: (
    nexusApiKey: string,
    collectionSlug: string,
    revisionNumber: number,
  ) => Promise<CollectionRevision>;
  getModFiles: (
    nexusApiKey: string,
    nexusModID: string,
  ) => Promise<
    { fileId: number; version: string; uploadedTimestamp: number }[]
  >;
  getMyCollections: (nexusApiKey: string) => Promise<MyCollection[]>;
  createCollection: (
    nexusApiKey: string,
    payload: ICollectionPayload,
  ) => Promise<{ collectionId: number; revisionId: number }>;
  createOrUpdateRevision: (
    nexusApiKey: string,
    payload: ICollectionPayload,
    collectionId: number,
  ) => Promise<{ revisionId: number }>;
  // Reads installationInfo from a collection revision and extracts D2RMM
  // mod configs embedded there. Returns a map of nexusModId → config.
  // Returns {} if the revision has no D2RMM configs.
  getCollectionModConfigs: (
    nexusApiKey: string,
    collectionSlug: string,
    revisionNumber: number,
  ) => Promise<Record<number, ModConfigValue>>;
  // Embeds all D2RMM mod configs into a revision's installationInfo field
  // so they can be restored when another user installs the collection.
  updateRevisionInstallationInfo: (
    nexusApiKey: string,
    revisionId: number,
    installationInfo: string,
  ) => Promise<void>;
};
