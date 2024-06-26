import { WriteStream, createWriteStream } from 'fs';
import { BroadcastAPI } from './BroadcastAPI';
import { RequestAPI } from './RequestAPI';

abstract class Destination {
  public abstract chunk(chunk: Buffer): void;
  public abstract end(): void;
}

export async function fetch<T extends Destination>(
  sourceUrl: string,
  destination: T,
  {
    onProgress,
  }: {
    onProgress?: (bytesDownloaded: number, bytesTotal: number) => Promise<void>;
  } = {},
): Promise<T> {
  const requestID = await RequestAPI.createRequest(sourceUrl);

  return new Promise<T>((resolve, reject) => {
    async function listener({
      chunk,
      bytesDownloaded,
      bytesTotal,
    }: {
      chunk: number[];
      bytesDownloaded: number;
      bytesTotal: number;
    }) {
      try {
        destination.chunk(Buffer.from(chunk));
        await onProgress?.(bytesDownloaded, bytesTotal);
      } catch (error) {
        reject(error);
      }
    }

    BroadcastAPI.addEventListener(requestID, listener);

    RequestAPI.sendRequest(requestID)
      .then(() => {
        try {
          destination.end();
        } catch (error) {
          reject(error);
          return;
        }
        resolve(destination);
      })
      .catch((error) => {
        try {
          destination.end();
        } catch {}
        reject(error);
      })
      .finally(() => {
        BroadcastAPI.removeEventListener(requestID, listener);
      });
  });
}

export class FileDestination extends Destination {
  private file: WriteStream;

  constructor(destinationPath: string) {
    super();
    this.file = createWriteStream(destinationPath);
  }

  public chunk(chunk: Buffer): void {
    this.file.write(chunk);
  }

  public end(): void {
    this.file.end();
  }
}

export class BufferDestination extends Destination {
  private data: Buffer = Buffer.alloc(0);

  public chunk(chunk: Buffer): void {
    this.data = Buffer.concat([this.data, chunk]);
  }

  public end(): void {}

  public get buffer(): Buffer {
    return this.data;
  }
}

export class StringDestination extends Destination {
  private data: string = '';

  public chunk(chunk: Buffer): void {
    this.data += chunk.toString();
  }

  public end(): void {}

  public toString(): string {
    return this.data;
  }

  public toJSON<T>(): T {
    return JSON.parse(this.data);
  }
}
