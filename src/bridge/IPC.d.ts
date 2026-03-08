import { ConsoleArg } from './ConsoleAPI';
import { SerializableType } from './Serializable';

export type IPCMessageRequest = {
  id: string;
  namespace: string;
  api: string;
  args: SerializableType[];
  result?: never;
  error?: never;
};

export type IPCMessageSuccessResponse = {
  id: string;
  namespace?: never;
  api?: never;
  args?: never;
  result: void | SerializableType | SerializableType[];
  error?: never;
};

export type IPCMessageErrorResponse = {
  id: string;
  namespace?: never;
  api?: never;
  args?: never;
  result?: never;
  error: {
    name: string;
    message: string;
    stack: string | undefined;
    __d2rmm_i18n_list?: ConsoleArg[];
  };
};

export type IPCMessageResponse =
  | IPCMessageSuccessResponse
  | IPCMessageErrorResponse;

export type IPCMessage = IPCMessageRequest | IPCMessageResponse;
