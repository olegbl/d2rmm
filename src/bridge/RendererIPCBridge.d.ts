import { IPCMessage } from './IPC';

type RendererIPCListener = (
  event: Electron.IpcRendererEvent,
  message: IPCMessage,
) => void;

export type RendererIPCBridge = {
  addListener: (listener: RendererIPCListener) => void;
  removeListener: (listener: RendererIPCListener) => void;
  send: (message: IPCMessage) => void;
};
