import { SerializableType } from './Serializable';

export type BroadcastListener<T extends unknown[]> = (
  ...args: T
) => Promise<void>;

export type IBroadcastAPI = {
  send: (eventID: string, ...args: SerializableType[]) => Promise<void>;
};

export type IBroadcastLocalAPI = {
  addEventListener: (
    eventID: string,
    listener: BroadcastListener<unknown[]>,
  ) => void;
  removeEventListener: (
    eventID: string,
    listener: BroadcastListener<unknown[]>,
  ) => void;
};

export type IBroadcastUnifiedAPI = IBroadcastAPI & IBroadcastLocalAPI;
