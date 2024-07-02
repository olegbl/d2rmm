import decompress from 'decompress';
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import type { IModUpdaterAPI } from 'bridge/ModUpdaterAPI';
import type {
  DownloadLink,
  Files,
  NexusModsApiStateEvent,
  ValidateResult,
} from 'bridge/NexusModsAPI';
import type { ResponseHeaders } from 'bridge/RequestAPI';
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

      // extract the zip file
      process.noAsar = true;
      await decompress(filePath, path.dirname(filePath));
      process.noAsar = false;
      rmSync(filePath);

      // delete all mod files except mod.config
      const updateDirPath = path.join(path.dirname(filePath), modID);
      if (!existsSync(updateDirPath)) {
        throw new Error(
          `Mod has an unexpected file structure. Expected to find directory ${modID} in downloaded .zip file.`,
        );
      }
      const modDirPath = path.join(getAppPath(), 'mods', modID);
      const configFilePath = path.join(modDirPath, 'config.json');
      if (existsSync(configFilePath)) {
        cpSync(configFilePath, path.join(updateDirPath, 'config.json'));
      }
      if (existsSync(modDirPath)) {
        rmSync(modDirPath, { force: true, recursive: true });
      }

      // copy the new extracted files to the mod directory
      mkdirSync(modDirPath, { recursive: true });
      cpSync(updateDirPath, modDirPath, { recursive: true });

      // clean up
      rmSync(updateDirPath, { force: true, recursive: true });

      return modID;
    },
  } as IModUpdaterAPI);
}
