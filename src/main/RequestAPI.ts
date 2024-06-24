import { net } from 'electron';
import type { IRequestAPI } from 'bridge/RequestAPI';
import { BroadcastAPI } from './BroadcastAPI';
import { provideAPI } from './IPC';

let REQUEST_COUNT = 0;
const PENDING_REQUESTS: Map<string, string> = new Map();

export async function initRequestAPI(): Promise<void> {
  provideAPI('RequestAPI', {
    async createRequest(url) {
      const id = `request:${REQUEST_COUNT++}`;
      PENDING_REQUESTS.set(id, url);
      return id;
    },
    // splitting the API into 2 parts allows requestors to
    // set up event listeners for a request before sending it
    async sendRequest(id) {
      const url = PENDING_REQUESTS.get(id);
      PENDING_REQUESTS.delete(id);
      if (url == null) {
        throw new Error(`Request ${id} not found.`);
      }

      const onData = (buffer: Buffer) => {
        // IPC has trouble with Buffer so send it as number[]
        BroadcastAPI.send(id, 'data', [...buffer.values()]).catch(
          console.error,
        );
      };

      const onSuccess = () => {
        BroadcastAPI.send(id, 'success').catch(console.error);
      };

      const onFailure = (error: Error) => {
        BroadcastAPI.send(id, 'error', error).catch(console.error);
      };

      const request = net.request(url);
      request.on('response', (response) => {
        response.on('error', onFailure);
        response.on('end', onSuccess);
        response.on('data', onData);
      });
      request.on('error', onFailure);
      request.end();
    },
  } as IRequestAPI);
}
