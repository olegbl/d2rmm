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
import { ChildProcess } from 'child_process';
import { BrowserWindow, ipcMain } from 'electron';

const REGISTERED_APIS: Map<
  string,
  { api: AsyncSerializableAPI<unknown>; broadcast: boolean }
> = new Map();

export function provideAPI<T extends AsyncSerializableAPI<T>>(
  namespace: string,
  api: AsAsyncSerializableAPI<T>,
  broadcast: boolean = false,
): void {
  REGISTERED_APIS.set(namespace, { api, broadcast });
}

function getAPIHandler(
  message: IPCMessage,
): AnyAsyncSerializableAPIMethod | null {
  if (message.namespace == null) {
    return null;
  }
  const api = REGISTERED_APIS.get(message.namespace)?.api;
  // @ts-ignore TypeScript can't guarantee that message.api exists on this API
  return api?.[message.api] ?? null;
}

function getIsProvidedAPIBroadcast(message: IPCMessage): boolean {
  return REGISTERED_APIS.get(message.namespace ?? '')?.broadcast ?? false;
}

let REQUEST_COUNT = 0;
const PENDING_REQUESTS: {
  [id: string]: {
    resolve: (result: IPCMessageSuccessResponse['result']) => void;
    reject: (error: Error) => void;
  };
} = {};

export function consumeAPI<T, TLocalAPI extends object = Record<string, never>>(
  namespace: string,
  localAPI: TLocalAPI = {} as TLocalAPI,
  broadcast: boolean = false,
): TLocalAPI & T {
  return new Proxy(localAPI, {
    get: (target, api) => {
      if (api in target) {
        return target[api as keyof typeof target];
      }
      return (...args: unknown[]) => {
        return new Promise((resolve, reject) => {
          const id = `main:${REQUEST_COUNT++}`;
          const request = {
            id,
            namespace,
            api,
            args,
          } as IPCMessageRequest;
          if (!broadcast) {
            PENDING_REQUESTS[id] = { resolve, reject };
          }
          if (!renderer?.isDestroyed()) {
            renderer?.send('ipc', request);
          }
          workers.forEach((w) => w.send(request));
          if (broadcast) {
            (resolve as () => void)();
          }
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
        const broadcast = getIsProvidedAPIBroadcast(message);
        handler(...message.args)
          .then((result) => {
            if (!broadcast) {
              worker.send({
                id: message.id,
                result,
              } as IPCMessageSuccessResponse);
            }
          })
          .catch((error: Error) => {
            if (!broadcast) {
              worker.send({
                id: message.id,
                error: {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                },
              } as IPCMessageErrorResponse);
            } else {
              console.error(error);
            }
          });
      }
    } else {
      const request = PENDING_REQUESTS[message.id];
      if (request != null) {
        delete PENDING_REQUESTS[message.id];
        if (message.error != null) {
          const error = new Error();
          error.name = message.error.name;
          error.message = message.error.message;
          error.stack = message.error.stack;
          request.reject(error);
        } else {
          request.resolve(message.result);
        }
      }
    }

    // forward message to the other threads
    if (!renderer?.isDestroyed()) {
      renderer?.send('ipc', message);
    }
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
          const broadcast = getIsProvidedAPIBroadcast(message);
          handler(...message.args)
            .then((result) => {
              if (!broadcast) {
                if (!renderer?.isDestroyed()) {
                  renderer?.send('ipc', {
                    id: message.id,
                    result,
                  } as IPCMessageSuccessResponse);
                }
              }
            })
            .catch((error: Error) => {
              if (!broadcast) {
                if (!renderer?.isDestroyed()) {
                  renderer?.send('ipc', {
                    id: message.id,
                    error: {
                      name: error.name,
                      message: error.message,
                      stack: error.stack,
                    },
                  } as IPCMessageErrorResponse);
                }
              } else {
                console.error(error);
              }
            });
        }
      } else {
        const request = PENDING_REQUESTS[message.id];
        if (request != null) {
          delete PENDING_REQUESTS[message.id];
          if (message.error != null) {
            const error = new Error();
            error.name = message.error.name;
            error.message = message.error.message;
            error.stack = message.error.stack;
            request.reject(error);
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
