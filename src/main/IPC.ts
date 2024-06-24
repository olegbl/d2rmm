import { ChildProcess } from 'child_process';
import { BrowserWindow, ipcMain } from 'electron';
import type {
  AnyAsyncSerializableAPIMethod,
  AsAsyncSerializableAPI,
  AsyncSerializableAPI,
} from 'bridge/API';
import type {
  IPCMessage,
  IPCMessageErrorResponse,
  IPCMessageRequest,
  IPCMessageSuccessResponse,
} from 'bridge/IPC';

const REGISTERED_APIS: { [namespace: string]: AsyncSerializableAPI<unknown> } =
  {};

export function provideAPI<T extends AsyncSerializableAPI<T>>(
  namespace: string,
  api: AsAsyncSerializableAPI<T>,
): void {
  REGISTERED_APIS[namespace] = api;
}

function getAPIHandler(
  message: IPCMessage,
): AnyAsyncSerializableAPIMethod | null {
  if (message.namespace == null) {
    return null;
  }
  const api: AsyncSerializableAPI<unknown> | undefined =
    REGISTERED_APIS[message.namespace];
  // @ts-ignore TypeScript can't guarantee that message.api exists on this API
  return api?.[message.api] ?? null;
}

let REQUEST_COUNT = 0;
const PENDING_REQUESTS: {
  [id: string]: {
    resolve: (result: IPCMessageSuccessResponse['result']) => void;
    reject: (error: IPCMessageErrorResponse['error']) => void;
  };
} = {};

export function consumeAPI<T, TLocalAPI extends object = Record<string, never>>(
  namespace: string,
  localAPI: TLocalAPI = {} as TLocalAPI,
): TLocalAPI & T {
  return new Proxy(localAPI, {
    get: (target, api) => {
      if (api in target) {
        return target[api as keyof typeof target];
      }
      return (...args: unknown[]) => {
        return new Promise((resolve, reject) => {
          const id = `main:${REQUEST_COUNT++}`;
          PENDING_REQUESTS[id] = { resolve, reject };
          const request = { id, namespace, api, args } as IPCMessageRequest;
          renderer?.send('ipc', request);
          workers.forEach((w) => w.send(request));
        });
      };
    },
  }) as TLocalAPI & T;
}

const workers: Set<ChildProcess> = new Set();

export function unregisterWorker(worker: ChildProcess): void {
  workers.delete(worker);
}

export function registerWorker(worker: ChildProcess): void {
  workers.add(worker);

  // handle messages received from the worker thread
  worker.on('message', (message: IPCMessage): void => {
    if (message.args != null) {
      const handler = getAPIHandler(message);
      if (handler != null) {
        handler(...message.args)
          .then((result) => {
            worker.send({
              id: message.id,
              result,
            } as IPCMessageSuccessResponse);
          })
          .catch((error: Error) => {
            worker.send({
              id: message.id,
              error,
            } as IPCMessageErrorResponse);
          });
      }
    } else {
      const request = PENDING_REQUESTS[message.id];
      if (request != null) {
        delete PENDING_REQUESTS[message.id];
        if (message.error instanceof Error) {
          request.reject(message.error);
        } else {
          request.resolve(message.result);
        }
      }
    }

    // forward message to the other threads
    renderer?.send('ipc', message);
    workers.forEach((w) => {
      if (w !== worker) {
        w.send(message);
      }
    });
  });
}

let renderer: BrowserWindow['webContents'] | null = null;

export async function initIPC(mainWindow: BrowserWindow): Promise<void> {
  renderer = mainWindow.webContents;

  // handle messages received from the renderer thread
  ipcMain.on(
    'ipc',
    (_event: Electron.IpcMainEvent, message: IPCMessage): void => {
      if (message.args != null) {
        const handler = getAPIHandler(message);
        if (handler != null) {
          handler(...message.args)
            .then((result) => {
              renderer?.send('ipc', {
                id: message.id,
                result,
              } as IPCMessageSuccessResponse);
            })
            .catch((error: Error) => {
              renderer?.send('ipc', {
                id: message.id,
                error,
              } as IPCMessageErrorResponse);
            });
        }
      } else {
        const request = PENDING_REQUESTS[message.id];
        if (request != null) {
          delete PENDING_REQUESTS[message.id];
          if (message.error instanceof Error) {
            request.reject(message.error);
          } else {
            request.resolve(message.result);
          }
        }
      }

      // forward message to the other threads
      workers.forEach((w) => w.send(message));
    },
  );
}
