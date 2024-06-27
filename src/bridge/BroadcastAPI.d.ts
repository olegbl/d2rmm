import { SerializableType } from './Serializable';

// this API is not type safe - it's just arbitrary broadcasts
// use consumeAPI / provideAPI for a type safe IPC API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BroadcastListener<T = any[]> = T extends any[]
  ? ((...args: T) => void) | ((...args: T) => Promise<void>)
  : never;

export type IBroadcastAPI = {
  send: (eventID: string, ...args: SerializableType[]) => Promise<void>;
};

export type IBroadcastLocalAPI = {
  addEventListener: <T>(
    eventID: string,
    listener: BroadcastListener<T>,
  ) => BroadcastListener<T>;
  removeEventListener: <T>(
    eventID: string,
    listener: BroadcastListener<T>,
  ) => void;
};

export type IBroadcastUnifiedAPI = IBroadcastAPI & IBroadcastLocalAPI;
