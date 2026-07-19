// node-7z ships no TypeScript types and the @types/node-7z package on npm
// targets an old, API-incompatible major version, so we declare just the
// slice of the v3 API this project uses.
declare module 'node-7z' {
  import { EventEmitter } from 'events';

  export type SevenZipOptions = Record<string, unknown>;

  export interface SevenZipStream extends EventEmitter {}

  export function extractFull(
    archive: string,
    output: string,
    options?: SevenZipOptions,
  ): SevenZipStream;
}
