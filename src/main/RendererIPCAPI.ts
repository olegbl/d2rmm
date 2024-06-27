import type { IRendererIPCAPI } from 'bridge/RendererIPCAPI';
import { consumeAPI } from './IPC';

const RealRendererIPCAPI = consumeAPI<IRendererIPCAPI>('RendererIPCAPI');

let isDisconnected = false;

export const RendererIPCAPI = {
  disconnect: async () => {
    if (isDisconnected) {
      return;
    }
    await RealRendererIPCAPI.disconnect();
    isDisconnected = true;
  },
} as IRendererIPCAPI;
