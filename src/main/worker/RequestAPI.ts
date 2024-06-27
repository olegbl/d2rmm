import { readFileSync, rmSync } from 'fs';
import type { IRequestAPI } from 'bridge/RequestAPI';
import { EventAPI } from './EventAPI';
import { consumeAPI } from './IPC';
import { uuid } from './uuid';

const NetworkedRequestAPI = consumeAPI<IRequestAPI>('RequestAPI', {});

type OnProgress = (progress: {
  bytesDownloaded: number;
  bytesTotal: number;
}) => Promise<void>;

type ILocalRequestAPI = {
  downloadToFile(
    url: string,
    fileName?: string,
    onProgress?: OnProgress,
  ): Promise<string>;
  downloadToBuffer(url: string, onProgress?: OnProgress): Promise<Buffer>;
};

export const RequestAPI = {
  async downloadToFile(
    url: string,
    fileName?: string,
    onProgress?: OnProgress,
  ): Promise<string> {
    const eventID = onProgress == null ? null : uuid();
    if (eventID != null && onProgress != null) {
      EventAPI.addEventListener(eventID, onProgress);
    }
    const filePath = await NetworkedRequestAPI.download(url, fileName, eventID);
    if (eventID != null && onProgress != null) {
      EventAPI.removeEventListener(eventID, onProgress);
    }
    return filePath;
  },

  async downloadToBuffer(
    url: string,
    onProgress?: OnProgress,
  ): Promise<Buffer> {
    const filePath = await this.downloadToFile(url, undefined, onProgress);
    const fileData = readFileSync(filePath, { encoding: null });
    rmSync(filePath);
    return fileData;
  },
} as ILocalRequestAPI;
