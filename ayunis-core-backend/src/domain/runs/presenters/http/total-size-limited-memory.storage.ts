import { PayloadTooLargeException } from '@nestjs/common';
import type { Request } from 'express';
import type { StorageEngine } from 'multer';

type StorageCallback = (
  error: Error | null,
  info?: Partial<Express.Multer.File>,
) => void;

export class TotalSizeLimitedMemoryStorage implements StorageEngine {
  private readonly receivedBytes = new WeakMap<Request, number>();

  constructor(private readonly maxTotalBytes: number) {}

  _handleFile(
    request: Request,
    file: Pick<Express.Multer.File, 'stream'>,
    callback: StorageCallback,
  ): void {
    const chunks: Buffer[] = [];
    let size = 0;
    const finish: StorageCallback = (error, info) => {
      file.stream.removeListener('data', onData);
      file.stream.removeListener('end', onEnd);
      file.stream.removeListener('error', onError);
      chunks.length = 0;
      callback(error, info);
    };
    const onError = (error: Error) => finish(error);
    const onEnd = () =>
      finish(null, { buffer: Buffer.concat(chunks, size), size });
    const onData = (chunk: Buffer) => {
      const total = (this.receivedBytes.get(request) ?? 0) + chunk.length;
      this.receivedBytes.set(request, total);
      if (total > this.maxTotalBytes) {
        finish(
          new PayloadTooLargeException('Total image upload size exceeded'),
        );
        file.stream.resume();
        return;
      }
      size += chunk.length;
      chunks.push(chunk);
    };
    file.stream.on('data', onData);
    file.stream.once('end', onEnd);
    file.stream.once('error', onError);
  }

  _removeFile(
    _request: Request,
    file: Express.Multer.File,
    callback: (error: Error | null) => void,
  ): void {
    delete (file as Partial<Express.Multer.File>).buffer;
    callback(null);
  }
}
