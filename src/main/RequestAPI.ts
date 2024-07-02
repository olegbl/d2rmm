import type { IRequestAPI } from 'bridge/RequestAPI';
import { app, net } from 'electron';
import { createWriteStream, mkdirSync, rmSync } from 'fs';
import path from 'path';
import { EventAPI } from './EventAPI';
import { provideAPI } from './IPC';

const THROTTLE_TIME_MS = 500;
let REQUEST_ID = 0;

export async function initRequestAPI(): Promise<void> {
  provideAPI('RequestAPI', {
    // splitting the API into 2 parts allows requestors to
    // set up event listeners for a request before sending it
    async download(url, options) {
      return new Promise((resolve, reject) => {
        const filePath = path.join(
          app.getPath('temp'),
          'D2RMM',
          'RequestAPI',
          options?.fileName ?? `${REQUEST_ID++}.dat`,
        );
        mkdirSync(path.dirname(filePath), { recursive: true });
        rmSync(filePath, { force: true });
        const file = createWriteStream(filePath);
        let bytesTotal = 0;
        let bytesDownloaded = 0;
        let lastEventTime = 0;

        const request = net.request(url);
        for (const [key, value] of Object.entries(options?.headers ?? {})) {
          request.setHeader(key, value);
        }
        request.on('response', (response) => {
          bytesTotal = parseInt(
            response.headers['content-length'] as string,
            10,
          );
          response.on('error', reject);
          response.on('end', () => {
            file.end();
            resolve({ filePath, headers: response.headers });
          });
          response.on('data', (buffer: Buffer) => {
            bytesDownloaded += buffer.length;
            file.write(buffer);

            if (
              options?.eventID != null &&
              Date.now() - lastEventTime > THROTTLE_TIME_MS
            ) {
              lastEventTime = Date.now();
              EventAPI.send(options?.eventID, {
                // IPC has trouble with Buffer so send it as number[]
                bytesDownloaded,
                bytesTotal,
              }).catch(console.error);
            }
          });
        });
        request.on('error', reject);
        request.end();
      });
    },
  } as IRequestAPI);
}
