import type { IModUpdaterAPI } from 'bridge/ModUpdaterAPI';
import type {
  ICollectionPayload,
  CollectionRevision,
  DownloadLink,
  Files,
  ICollectionManifest,
  MyCollection,
  NexusModsApiStateEvent,
  PreSignedUrl,
  ValidateResult,
} from 'bridge/NexusModsAPI';
import type { ResponseHeaders } from 'bridge/RequestAPI';
import decompress from 'decompress';
import { zipSync } from 'fflate';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import os from 'os';
import path from 'path';
import { getAppPath } from './AppInfoAPI';
import { EventAPI } from './EventAPI';
import { provideAPI } from './IPC';
import { RequestAPI } from './RequestAPI';

// TODO: publish status of update checking / downloading / installing for nice UX

const NexusModsAPI = {
  publishStatus: async (headers: ResponseHeaders): Promise<void> => {
    const status = {
      dailyLimit: headers['x-rl-daily-limit'],
      dailyRemaining: headers['x-rl-daily-remaining'],
      dailyReset: headers['x-rl-daily-reset'],
      hourlyLimit: headers['x-rl-hourly-limit'],
      hourlyRemaining: headers['x-rl-hourly-remaining'],
      hourlyReset: headers['x-rl-hourly-reset'],
    } as NexusModsApiStateEvent;
    console.debug('NexusModsAPI', 'publishStatus', status);
    await EventAPI.send('nexus-mods-api-status', status);
  },
  validateApiKey: async (nexusApiKey: string): Promise<ValidateResult> => {
    console.debug('NexusModsAPI', 'validateApiKey');
    const { response, headers } = await RequestAPI.downloadToBuffer(
      'https://api.nexusmods.com/v1/users/validate.json',
      {
        headers: {
          accept: 'application/json',
          apikey: nexusApiKey,
        },
      },
    );
    await NexusModsAPI.publishStatus(headers);
    return JSON.parse(response.toString()) as ValidateResult;
  },
  getFile: async (
    nexusApiKey: string,
    nexusModID: string,
    nexusFileID: number,
  ): Promise<File> => {
    console.debug('NexusModsAPI', 'getFile', {
      nexusModID,
      nexusFileID,
    });
    const { response, headers } = await RequestAPI.downloadToBuffer(
      `https://api.nexusmods.com/v1/games/diablo2resurrected/mods/${nexusModID}/files/${nexusFileID}.json`,
      {
        headers: {
          accept: 'application/json',
          apikey: nexusApiKey,
        },
      },
    );
    await NexusModsAPI.publishStatus(headers);
    return JSON.parse(response.toString()) as File;
  },
  getFiles: async (nexusApiKey: string, nexusModID: string): Promise<Files> => {
    console.debug('NexusModsAPI', 'getFiles', {
      nexusModID,
    });
    const { response, headers } = await RequestAPI.downloadToBuffer(
      `https://api.nexusmods.com/v1/games/diablo2resurrected/mods/${nexusModID}/files.json`,
      {
        headers: {
          accept: 'application/json',
          apikey: nexusApiKey,
        },
      },
    );
    await NexusModsAPI.publishStatus(headers);
    return JSON.parse(response.toString()) as Files;
  },
  getCollectionRevision: async (
    nexusApiKey: string,
    collectionSlug: string,
    revisionNumber: number,
  ): Promise<CollectionRevision> => {
    console.debug('NexusModsAPI', 'getCollectionRevision', {
      collectionSlug,
      revisionNumber,
    });
    const query = `
      query CollectionRevision($slug: String!, $revision: Int!, $viewAdultContent: Boolean) {
        collectionRevision(slug: $slug, revision: $revision, viewAdultContent: $viewAdultContent) {
          revisionNumber
          modFiles {
            fileId
            optional
            file {
              fileId
              modId
              mod {
                modId
                modCategory {
                  name
                }
                game {
                  domainName
                }
              }
            }
          }
        }
      }
    `;
    const response = await fetch('https://api.nexusmods.com/v2/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        apikey: nexusApiKey,
      },
      body: JSON.stringify({
        query,
        variables: {
          slug: collectionSlug,
          revision: revisionNumber,
          viewAdultContent: true,
        },
      }),
    });
    const data = (await response.json()) as {
      data: { collectionRevision: CollectionRevision };
      errors?: { message: string }[];
    };
    if (data.errors != null && data.errors.length > 0) {
      throw new Error(`GraphQL error: ${data.errors[0].message}`);
    }
    if (data.data.collectionRevision == null) {
      throw new Error(
        `Collection "${collectionSlug}" revision ${revisionNumber} not found.`,
      );
    }
    return data.data.collectionRevision;
  },
  getMyCollections: async (nexusApiKey: string): Promise<MyCollection[]> => {
    console.debug('NexusModsAPI', 'getMyCollections');
    const query = `
      query MyCollections($gameDomain: String) {
        myCollections(
          gameDomain: $gameDomain,
          viewAdultContent: true,
          viewUnlisted: true,
          viewUnderModeration: true,
        ) {
          nodes {
            id
            slug
            name
          }
        }
      }
    `;
    const response = await fetch('https://api.nexusmods.com/v2/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        apikey: nexusApiKey,
      },
      body: JSON.stringify({
        query,
        variables: { gameDomain: 'diablo2resurrected' },
      }),
    });
    const data = (await response.json()) as {
      data: { myCollections: { nodes: MyCollection[] } };
      errors?: { message: string }[];
    };
    if (data.errors != null && data.errors.length > 0) {
      throw new Error(`GraphQL error: ${data.errors[0].message}`);
    }
    return data.data.myCollections.nodes;
  },
  getRevisionUploadUrl: async (nexusApiKey: string): Promise<PreSignedUrl> => {
    console.debug('NexusModsAPI', 'getRevisionUploadUrl');
    const query = `
      query CollectionRevisionUploadUrl {
        collectionRevisionUploadUrl {
          uuid
          url
        }
      }
    `;
    const response = await fetch('https://api.nexusmods.com/v2/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        apikey: nexusApiKey,
      },
      body: JSON.stringify({ query }),
    });
    const data = (await response.json()) as unknown;
    console.debug('NexusModsAPI', 'getRevisionUploadUrl response', data);
    const typed = data as {
      data?: { collectionRevisionUploadUrl?: { uuid: string; url: string } };
      errors?: { message: string }[];
    };
    if (typed.errors != null && typed.errors.length > 0) {
      throw new Error(`GraphQL error: ${typed.errors[0].message}`);
    }
    const result = typed.data?.collectionRevisionUploadUrl;
    if (result == null) {
      throw new Error('collectionRevisionUploadUrl returned no data');
    }
    return { uuid: result.uuid, uploadUrl: result.url };
  },
  uploadCollectionAsset: async (
    uploadUrl: string,
    manifest: ICollectionManifest,
  ): Promise<void> => {
    console.debug('NexusModsAPI', 'uploadCollectionAsset');
    // Nexus validates the upload as an archive containing collection.json.
    // The upload manifest includes modRules (required by the Vortex-compatible schema)
    // which cannot be sent in the GraphQL mutation payload.
    const uploadManifest = { ...manifest, modRules: [] };
    const jsonBytes = Buffer.from(JSON.stringify(uploadManifest));
    const body = Buffer.from(zipSync({ 'collection.json': jsonBytes }));
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body,
    });
    console.debug(
      'NexusModsAPI',
      'uploadCollectionAsset response',
      uploadResponse.status,
    );
    if (!uploadResponse.ok) {
      const text = await uploadResponse.text();
      throw new Error(
        `Asset upload failed (${uploadResponse.status}): ${text}`,
      );
    }
  },
  createCollection: async (
    nexusApiKey: string,
    payload: ICollectionPayload,
    assetUUID: string,
  ): Promise<{ collectionId: number; revisionId: number }> => {
    console.debug('NexusModsAPI', 'createCollection');
    const mutation = `
      mutation CreateCollection($data: CollectionPayload!, $uuid: String!) {
        createCollection(collectionData: $data, uuid: $uuid) {
          collection { id }
          revision { id }
          success
        }
      }
    `;
    const response = await fetch('https://api.nexusmods.com/v2/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        apikey: nexusApiKey,
      },
      body: JSON.stringify({
        query: mutation,
        variables: { data: payload, uuid: assetUUID },
      }),
    });
    const data = (await response.json()) as {
      data: {
        createCollection: {
          collection: { id: number };
          revision: { id: number };
          success: boolean;
        };
      };
      errors?: { message: string }[];
    };
    if (data.errors != null && data.errors.length > 0) {
      throw new Error(`GraphQL error: ${data.errors[0].message}`);
    }
    return {
      collectionId: data.data.createCollection.collection.id,
      revisionId: data.data.createCollection.revision.id,
    };
  },
  createOrUpdateRevision: async (
    nexusApiKey: string,
    payload: ICollectionPayload,
    assetUUID: string,
    collectionId: number,
  ): Promise<{ revisionId: number }> => {
    console.debug('NexusModsAPI', 'createOrUpdateRevision', { collectionId });
    const mutation = `
      mutation CreateOrUpdateRevision($data: CollectionPayload!, $uuid: String!, $collectionId: Int!) {
        createOrUpdateRevision(collectionData: $data, uuid: $uuid, collectionId: $collectionId) {
          revision { id }
          success
        }
      }
    `;
    const response = await fetch('https://api.nexusmods.com/v2/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        apikey: nexusApiKey,
      },
      body: JSON.stringify({
        query: mutation,
        variables: { data: payload, uuid: assetUUID, collectionId },
      }),
    });
    const data = (await response.json()) as {
      data: {
        createOrUpdateRevision: { revision: { id: number }; success: boolean };
      };
      errors?: { message: string }[];
    };
    if (data.errors != null && data.errors.length > 0) {
      throw new Error(`GraphQL error: ${data.errors[0].message}`);
    }
    return { revisionId: data.data.createOrUpdateRevision.revision.id };
  },
  getDownloadLink: async (
    nexusApiKey: string,
    nexusModID: string,
    nexusFileID: number,
    key?: string,
    expires?: number,
  ): Promise<DownloadLink> => {
    console.debug('NexusModsAPI', 'getDownloadLink', {
      nexusModID,
      nexusFileID,
      expires,
    });
    const args =
      key != null && expires != null ? `?key=${key}&expires=${expires}` : '';
    const { response, headers } = await RequestAPI.downloadToBuffer(
      `https://api.nexusmods.com/v1/games/diablo2resurrected/mods/${nexusModID}/files/${nexusFileID}/download_link.json${args}`,
      {
        headers: {
          accept: 'application/json',
          apikey: nexusApiKey,
        },
      },
    );
    await NexusModsAPI.publishStatus(headers);
    return JSON.parse(response.toString()) as DownloadLink;
  },
};

function findModInfo(dirPath: string): string | null {
  if (existsSync(path.join(dirPath, 'mod.json'))) return dirPath;
  if (existsSync(path.join(dirPath, 'modinfo.json'))) return dirPath;
  for (const fileName of readdirSync(dirPath, { encoding: null })) {
    const fp = path.join(dirPath, fileName);
    if (statSync(fp).isDirectory()) {
      const result = findModInfo(fp);
      if (result != null) return result;
    }
  }
  return null;
}

async function installFromZipPath(
  zipFilePath: string,
  modID: string,
): Promise<string> {
  console.debug('ModUpdaterAPI', 'installFromZipPath', { zipFilePath, modID });

  const extractDirPath = path.join(os.tmpdir(), 'D2RMM', 'ModInstall', modID);
  if (existsSync(extractDirPath)) {
    rmSync(extractDirPath, { force: true, recursive: true });
  }
  mkdirSync(extractDirPath, { recursive: true });

  process.noAsar = true;
  await decompress(zipFilePath, extractDirPath);
  process.noAsar = false;

  console.debug('ModUpdaterAPI', 'extracted zip file', {
    modID,
    zipFilePath,
    extractDirPath,
  });

  const extractedModDirPath = findModInfo(extractDirPath);
  if (extractedModDirPath == null) {
    rmSync(extractDirPath, { force: true, recursive: true });
    throw new Error(
      `Mod has an unexpected file structure. Expected to find a "mod.json" (for D2RMM mods) or a "modinfo.json" (for data mods) file somewhere in the .zip file.`,
    );
  }

  console.debug('ModUpdaterAPI', 'validated extracted files', {
    modID,
    extractedModDirPath,
  });

  const modDirPath = path.join(getAppPath(), 'mods', modID);
  const configFilePath = path.join(modDirPath, 'config.json');
  if (existsSync(configFilePath)) {
    cpSync(configFilePath, path.join(extractedModDirPath, 'config.json'));
  }
  if (existsSync(modDirPath)) {
    rmSync(modDirPath, { force: true, recursive: true });
  }

  console.debug('ModUpdaterAPI', 'cleaned up old mod directory', {
    modID,
    modDirPath,
  });

  mkdirSync(modDirPath, { recursive: true });
  cpSync(extractedModDirPath, modDirPath, { recursive: true });
  rmSync(extractDirPath, { force: true, recursive: true });

  console.debug('ModUpdaterAPI', 'installed mod', { modID });

  return modID;
}

async function installFromFolderPath(
  folderPath: string,
  modID: string,
): Promise<string> {
  console.debug('ModUpdaterAPI', 'installFromFolderPath', {
    folderPath,
    modID,
  });

  const extractedModDirPath = findModInfo(folderPath);
  if (extractedModDirPath == null) {
    throw new Error(
      `Mod has an unexpected file structure. Expected to find a "mod.json" (for D2RMM mods) or a "modinfo.json" (for data mods) file somewhere in the folder.`,
    );
  }

  console.debug('ModUpdaterAPI', 'validated folder structure', {
    modID,
    extractedModDirPath,
  });

  // Read existing config before overwriting the mod directory, so we do not
  // write into the user's source folder (unlike the zip path which uses a
  // temporary extraction directory).
  const modDirPath = path.join(getAppPath(), 'mods', modID);
  const configFilePath = path.join(modDirPath, 'config.json');
  const existingConfig = existsSync(configFilePath)
    ? readFileSync(configFilePath)
    : null;

  if (existsSync(modDirPath)) {
    rmSync(modDirPath, { force: true, recursive: true });
  }

  mkdirSync(modDirPath, { recursive: true });
  cpSync(extractedModDirPath, modDirPath, { recursive: true });

  if (existingConfig != null) {
    writeFileSync(path.join(modDirPath, 'config.json'), existingConfig);
  }

  console.debug('ModUpdaterAPI', 'installed mod from folder', { modID });

  return modID;
}

export async function initModUpdaterAPI(): Promise<void> {
  provideAPI('ModUpdaterAPI', {
    validateNexusApiKey: async (nexusApiKey) => {
      const result = await NexusModsAPI.validateApiKey(nexusApiKey);
      const isValid = result.key === nexusApiKey;
      return {
        name: result.name,
        email: result.email,
        isValid,
        isPremium: !isValid ? false : result.is_premium,
      };
    },
    getDownloadsViaNexus: async (nexusApiKey, nexusModID) => {
      const result = await NexusModsAPI.getFiles(nexusApiKey, nexusModID);
      return result.files
        .filter(
          (file) =>
            file.category_name === 'MAIN' ||
            file.category_name === 'OLD_VERSION',
        )
        .map((file) => ({
          type: 'nexus',
          version: file.version,
          modID: nexusModID,
          fileID: file.file_id,
        }));
    },
    installModViaNexus: async (
      modID,
      nexusApiKey,
      nexusModID,
      nexusFileID,
      key,
      expires,
    ) => {
      console.debug('ModUpdaterAPI', 'installModViaNexus', {
        modID,
        nexusModID,
        nexusFileID,
      });
      // get link to the zip file on Nexus Mods CDN
      const downloadLink = await NexusModsAPI.getDownloadLink(
        nexusApiKey,
        nexusModID,
        nexusFileID,
        key,
        expires,
      );
      const downloadUrl = downloadLink[0]?.URI;
      if (downloadUrl == null) {
        throw new Error(
          `No download links found for Nexus mod ${nexusModID} file ${nexusFileID}.`,
        );
      }

      if (modID == null) {
        // TODO: should this use the name of the mod on Nexus instead?
        const file = await NexusModsAPI.getFile(
          nexusApiKey,
          nexusModID,
          nexusFileID,
        );
        modID = file.name;
      }

      // download the zip file
      const fileName = `${modID}.zip`;
      const { filePath } = await RequestAPI.downloadToFile(downloadUrl, {
        fileName,
      });

      console.debug('ModUpdaterAPI', 'downloaded zip file', {
        modID,
        nexusModID,
        nexusFileID,
        downloadFilePath: filePath,
      });

      try {
        return await installFromZipPath(filePath, modID);
      } finally {
        // Always remove the downloaded temp zip, even on failure.
        if (existsSync(filePath)) {
          rmSync(filePath);
        }
      }
    },
    installModFromZip: async (zipFilePath) => {
      const modID = path.basename(zipFilePath, '.zip');
      return installFromZipPath(zipFilePath, modID);
    },
    installModFromFolder: async (folderPath) => {
      const modID = path.basename(folderPath);
      return installFromFolderPath(folderPath, modID);
    },
    getCollectionRevision: async (
      nexusApiKey,
      collectionSlug,
      revisionNumber,
    ) => {
      return NexusModsAPI.getCollectionRevision(
        nexusApiKey,
        collectionSlug,
        revisionNumber,
      );
    },
    getModFiles: async (nexusApiKey, nexusModID) => {
      const result = await NexusModsAPI.getFiles(nexusApiKey, nexusModID);
      return result.files
        .filter(
          (file) =>
            file.category_name === 'MAIN' ||
            file.category_name === 'OLD_VERSION',
        )
        .map((file) => ({
          fileId: file.file_id,
          version: file.version,
          uploadedTimestamp: file.uploaded_timestamp,
        }));
    },
    getMyCollections: async (nexusApiKey) => {
      return NexusModsAPI.getMyCollections(nexusApiKey);
    },
    createCollection: async (nexusApiKey, payload) => {
      const { uuid, uploadUrl } =
        await NexusModsAPI.getRevisionUploadUrl(nexusApiKey);
      await NexusModsAPI.uploadCollectionAsset(
        uploadUrl,
        payload.collectionManifest,
      );
      const result = await NexusModsAPI.createCollection(
        nexusApiKey,
        payload,
        uuid,
      );
      // createCollection creates the collection shell but doesn't process the
      // S3 manifest for the mod list. Call createOrUpdateRevision with the same
      // UUID (file is already on S3) to populate the draft revision with mods.
      await NexusModsAPI.createOrUpdateRevision(
        nexusApiKey,
        payload,
        uuid,
        result.collectionId,
      );
      return result;
    },
    createOrUpdateRevision: async (nexusApiKey, payload, collectionId) => {
      const { uuid, uploadUrl } =
        await NexusModsAPI.getRevisionUploadUrl(nexusApiKey);
      await NexusModsAPI.uploadCollectionAsset(
        uploadUrl,
        payload.collectionManifest,
      );
      const result = await NexusModsAPI.createOrUpdateRevision(
        nexusApiKey,
        payload,
        uuid,
        collectionId,
      );
      return result;
    },
  } as IModUpdaterAPI);
}
