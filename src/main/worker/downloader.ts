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
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onData = (chunk: number[]) => {
      try {
        destination.chunk(Buffer.from(chunk));
      } catch (error) {
        reject(error);
      }
    };
    const onSuccess = () => {
      try {
        destination.end();
      } catch (error) {
        reject(error);
        return;
      }
      resolve(destination);
    };
    const onFailure = () => {
      try {
        destination.end();
      } catch (error) {
        reject(error);
        return;
      }
      reject();
    };
    RequestAPI.createRequest(sourceUrl).then((id) => {
      const listener = async (event: unknown, payload: unknown) => {
        switch (event as 'data' | 'success' | 'error') {
          case 'data':
            onData(payload as number[]);
            break;
          case 'success':
            BroadcastAPI.removeEventListener(id, listener);
            onSuccess();
            break;
          case 'error':
            BroadcastAPI.removeEventListener(id, listener);
            onFailure();
            break;
        }
      };
      BroadcastAPI.addEventListener(id, listener);
      RequestAPI.sendRequest(id);
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
