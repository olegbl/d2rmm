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
import type { RendererIPCBridge } from 'bridge/RendererIPCBridge';
import type { SerializableType } from 'bridge/Serializable';

declare global {
  interface Window {
    IPCBridge: RendererIPCBridge;
  }
}

const IPCBridge = window.IPCBridge;

type RegisteredAPIs = { [namespace: string]: AsyncSerializableAPI<unknown> };
const REGISTERED_APIS: RegisteredAPIs = {};

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

export async function initIPC(): Promise<void> {
  IPCBridge.addListener(
    (_event: Electron.IpcRendererEvent, message: IPCMessage) => {
      if (message.args != null) {
        const handler = getAPIHandler(message);
        if (handler != null) {
          handler(...message.args)
            .then((result) => {
              IPCBridge.send({
                id: message.id,
                result,
              } as IPCMessageSuccessResponse);
            })
            .catch((error: Error) => {
              IPCBridge.send({
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
    },
  );
}

export function consumeAPI<T, TLocalAPI extends object = Record<string, never>>(
  namespace: string,
  localAPI: TLocalAPI = {} as TLocalAPI,
): TLocalAPI & T {
  return new Proxy(localAPI, {
    get: (target, api) => {
      if (api in target) {
        return target[api as keyof typeof target];
      }
      return (...args: SerializableType[]) => {
        return new Promise((resolve, reject) => {
          const id = `worker:${REQUEST_COUNT++}`;
          PENDING_REQUESTS[id] = { resolve, reject };
          IPCBridge.send({
            id,
            namespace,
            api: String(api),
            args,
          } as IPCMessageRequest);
        });
      };
    },
  }) as TLocalAPI & T;
}
