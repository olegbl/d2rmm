import { net } from 'electron';
import { WriteStream, createWriteStream } from 'fs';

abstract class Destination {
  public abstract chunk(chunk: Buffer): void;
  public abstract end(): void;
}

export async function fetch<T extends Destination>(
  sourceUrl: string,
  destination: T,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onChunk = (chunk: Buffer) => {
      try {
        destination.chunk(chunk);
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
    const request = net.request(sourceUrl);
    request.on('response', (response) => {
      response.on('data', onChunk);
      response.on('end', onSuccess);
      response.on('error', onFailure);
    });
    request.on('error', onFailure);
    request.end();
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
