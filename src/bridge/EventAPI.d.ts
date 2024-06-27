import { SerializableType } from './Serializable';

// this API is not type safe - it's just arbitrary broadcasts
// use consumeAPI / provideAPI for a type safe IPC API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventAPIListener<T = any[]> = T extends any[]
  ? ((...args: T) => void) | ((...args: T) => Promise<void>)
  : never;

export type IEventAPI = {
  send: (eventID: string, ...args: SerializableType[]) => Promise<void>;
};

export type IEventLocalAPI = {
  addEventListener: <T>(
    eventID: string,
    listener: EventAPIListener<T>,
  ) => EventAPIListener<T>;
  removeEventListener: <T>(
    eventID: string,
    listener: EventAPIListener<T>,
  ) => void;
};

export type IEventUnifiedAPI = IEventAPI & IEventLocalAPI;
