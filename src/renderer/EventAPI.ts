import { useEffect } from 'react';
import type {
  EventAPIListener,
  IEventAPI,
  IEventLocalAPI,
  IEventUnifiedAPI,
} from 'bridge/EventAPI';
import { consumeAPI, provideAPI } from './IPC';

export const EventAPI: IEventUnifiedAPI = consumeAPI<IEventAPI, IEventLocalAPI>(
  'EventAPI',
  {
    addEventListener: (eventID, listener) => {
      let eventListeners = LISTENERS.get(eventID);
      if (eventListeners == null) {
        eventListeners = new Set();
        LISTENERS.set(eventID, eventListeners);
      }
      eventListeners.add(listener);
      return listener;
    },
    removeEventListener: (eventID, listener) => {
      const eventListeners = LISTENERS.get(eventID);
      eventListeners?.delete(listener);
    },
  },
  true,
);

const LISTENERS: Map<string, Set<EventAPIListener>> = new Map();

export async function initEventAPI(): Promise<void> {
  provideAPI(
    'EventAPI',
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
    } as IEventAPI,
    true,
  );
}

export function useEventAPIListener<T>(
  eventID: string,
  listener: EventAPIListener<T>,
): void {
  useEffect(() => {
    EventAPI.addEventListener(eventID, listener);
    return () => EventAPI.removeEventListener(eventID, listener);
  }, [eventID, listener]);
}