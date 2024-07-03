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
import type { IRendererIPCAPI } from 'bridge/RendererIPCAPI';
import type { RendererIPCBridge } from 'bridge/RendererIPCBridge';
import type { SerializableType } from 'bridge/Serializable';

declare global {
  interface Window {
    IPCBridge: RendererIPCBridge;
  }
}

const IPCBridge = window.IPCBridge;

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

const listener = (_event: Electron.IpcRendererEvent, message: IPCMessage) => {
  if (message.args != null) {
    const handler = getAPIHandler(message);
    if (handler != null) {
      const broadcast = getIsProvidedAPIBroadcast(message);
      handler(...message.args)
        .then((result) => {
          if (!broadcast) {
            IPCBridge.send({
              id: message.id,
              result,
            } as IPCMessageSuccessResponse);
          }
        })
        .catch((error: Error) => {
          if (!broadcast) {
            IPCBridge.send({
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
        console.debug('IPC:Renderer:Response:Error', message.id, message.error);
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
};

export async function initIPC(): Promise<void> {
  IPCBridge.addListener(listener);

  provideAPI('RendererIPCAPI', {
    disconnect: async () => {
      IPCBridge.removeAllListeners();
    },
  } as IRendererIPCAPI);
}

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
      return (...args: SerializableType[]) => {
        return new Promise((resolve, reject) => {
          const id = `worker:${REQUEST_COUNT++}`;
          const request = {
            id,
            namespace,
            api: String(api),
            args,
          } as IPCMessageRequest;
          if (!broadcast) {
            PENDING_REQUESTS[id] = { resolve, reject };
          }
          IPCBridge.send(request);
          if (broadcast) {
            (resolve as () => void)();
          }
        });
      };
    },
  }) as TLocalAPI & T;
}
