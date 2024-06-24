import ffi from 'ffi-napi';
import path from 'path';
import ref from 'ref-napi';
import { getAppPath } from './AppInfoAPI';

// http://www.zezula.net/en/casc/casclib.html
export type ICascLib = {
  CascCloseFile: ffi.ForeignFunction<boolean, [ref.Pointer<void>]>;
  CascCloseStorage: ffi.ForeignFunction<boolean, [ref.Pointer<void>]>;
  CascOpenFile: ffi.ForeignFunction<
    boolean,
    [ref.Pointer<void>, string, number, number, ref.Pointer<ref.Pointer<void>>]
  >;
  CascOpenStorage: ffi.ForeignFunction<
    boolean,
    [string, number, ref.Pointer<ref.Pointer<void>>]
  >;
  CascReadFile: ffi.ForeignFunction<
    boolean,
    [ref.Pointer<void>, ref.Pointer<void>, number, ref.Pointer<number>]
  >;
  GetLastError: ffi.ForeignFunction<number, []>;
};

export const voidPtr = ref.refType(ref.types.void);
export const voidPtrPtr = ref.refType(voidPtr);
export const dwordPtr = ref.refType(ref.types.uint32);

let CASC_LIB: ICascLib;

export async function initCascLib(): Promise<void> {
  CASC_LIB = ffi.Library(path.join(getAppPath(), 'tools', 'CascLib.dll'), {
    CascCloseFile: ['bool', [voidPtr]],
    CascCloseStorage: ['bool', [voidPtr]],
    CascOpenFile: ['bool', [voidPtr, 'string', 'int', 'int', voidPtrPtr]],
    CascOpenStorage: ['bool', ['string', 'int', voidPtrPtr]],
    CascReadFile: ['bool', [voidPtr, voidPtr, 'int', dwordPtr]],
    GetLastError: ['int', []],
  });
}

export function getCascLib(): ICascLib {
  return CASC_LIB;
}

// CascLib Error Codes for GetLastError()
const KnownCastLibErrorCodes: { [code: number]: string } = {
  0: 'ERROR_SUCCESS',
  2: 'ERROR_PATH_NOT_FOUND',
  1: 'ERROR_ACCESS_DENIED',
  9: 'ERROR_INVALID_HANDLE',
  12: 'ERROR_NOT_ENOUGH_MEMORY',
  45: 'ERROR_NOT_SUPPORTED',
  22: 'ERROR_INVALID_PARAMETER',
  28: 'ERROR_DISK_FULL',
  17: 'ERROR_ALREADY_EXISTS',
  55: 'ERROR_INSUFFICIENT_BUFFER',
  1000: 'ERROR_BAD_FORMAT',
  1001: 'ERROR_NO_MORE_FILES',
  1002: 'ERROR_HANDLE_EOF',
  1003: 'ERROR_CAN_NOT_COMPLETE',
  1004: 'ERROR_FILE_CORRUPT',
  1005: 'ERROR_FILE_ENCRYPTED',
  1006: 'ERROR_FILE_TOO_LARGE',
  1007: 'ERROR_ARITHMETIC_OVERFLOW',
  1008: 'ERROR_NETWORK_NOT_AVAILABLE',
};

export function processErrorCode(errorCodeArg: string | number): string {
  let errorCode = errorCodeArg;
  if (typeof errorCode === 'string') {
    errorCode = parseInt(errorCode, 10);
  }
  return KnownCastLibErrorCodes[errorCode];
}
