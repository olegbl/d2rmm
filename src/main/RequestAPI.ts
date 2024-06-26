import { net } from 'electron';
import type { IRequestAPI } from 'bridge/RequestAPI';
import { BroadcastAPI } from './BroadcastAPI';
import { provideAPI } from './IPC';

let REQUEST_COUNT = 0;
const PENDING_REQUESTS: Map<string, string> = new Map();

export async function initRequestAPI(): Promise<void> {
  provideAPI('RequestAPI', {
    async createRequest(url) {
      const id = `RequestAPI:request:${REQUEST_COUNT++}`;
      PENDING_REQUESTS.set(id, url);
      return id;
    },
    // splitting the API into 2 parts allows requestors to
    // set up event listeners for a request before sending it
    async sendRequest(id) {
      return new Promise((resolve, reject) => {
        const url = PENDING_REQUESTS.get(id);
        PENDING_REQUESTS.delete(id);
        if (url == null) {
          reject(new Error(`Request ${id} not found.`));
          return;
        }

        let bytesTotal = 0;
        let bytesDownloaded = 0;

        const request = net.request(url);
        request.on('response', (response) => {
          bytesTotal = parseInt(
            response.headers['content-length'] as string,
            10,
          );
          response.on('error', reject);
          response.on('end', resolve);
          response.on('data', (buffer: Buffer) => {
            bytesDownloaded += buffer.length;

            // IPC has trouble with Buffer so send it as number[]
            BroadcastAPI.send(id, {
              chunk: [...buffer],
              bytesDownloaded,
              bytesTotal,
            }).catch(console.error);
          });
        });
        request.on('error', reject);
        request.end();
      });
    },
  } as IRequestAPI);
}
