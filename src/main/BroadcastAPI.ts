import type {
  BroadcastListener,
  IBroadcastAPI,
  IBroadcastLocalAPI,
  IBroadcastUnifiedAPI,
} from 'bridge/BroadcastAPI';
import { consumeAPI, provideAPI } from './IPC';

export const BroadcastAPI: IBroadcastUnifiedAPI = consumeAPI<
  IBroadcastAPI,
  IBroadcastLocalAPI
>(
  'BroadcastAPI',
  {
    addEventListener: (eventID, listener) => {
      let eventListeners = LISTENERS.get(eventID);
      if (eventListeners == null) {
        eventListeners = new Set();
        LISTENERS.set(eventID, eventListeners);
      }
      eventListeners.add(listener);
    },
    removeEventListener: (eventID, listener) => {
      const eventListeners = LISTENERS.get(eventID);
      eventListeners?.delete(listener);
    },
  },
  true,
);

const LISTENERS: Map<string, Set<BroadcastListener>> = new Map();

export async function initBroadcastAPI(): Promise<void> {
  provideAPI(
    'BroadcastAPI',
    {
      send: async (eventID: string, ...args: unknown[]) => {
        const eventListeners = LISTENERS.get(eventID);
        if (eventListeners != null) {
          for (const listener of eventListeners) {
            const result = listener(...args);
            if (result instanceof Promise) {
              result.catch(console.error);
            }
          }
        }
      },
    } as IBroadcastAPI,
    true,
  );
}
