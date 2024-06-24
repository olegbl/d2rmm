import { SerializableType } from './Serializable';

type IPCMessageRequest = {
  id: string;
  namespace: string;
  api: string;
  args: SerializableType[];
  result?: never;
  error?: never;
};

type IPCMessageSuccessResponse = {
  id: string;
  namespace?: never;
  api?: never;
  args?: never;
  result: void | SerializableType | SerializableType[];
  error?: never;
};

type IPCMessageErrorResponse = {
  id: string;
  namespace?: never;
  api?: never;
  args?: never;
  result?: never;
  error: Error;
};

export type IPCMessageResponse =
  | IPCMessageSuccessResponse
  | IPCMessageErrorResponse;

export type IPCMessage = IPCMessageRequest | IPCMessageResponse;
