import { PayloadTooLargeException } from '@nestjs/common';
import type { Request } from 'express';
import type { StorageEngine } from 'multer';
import { UploadBytes, type UploadedImageFile } from './upload-bytes';
import type { ImageUploadAdmission } from './image-upload-admission';
import { ImageUploadsBusyException } from './image-upload-admission';
import { IMAGE_UPLOAD_RETRY_AFTER_SECONDS } from './image-upload.constants';

type StorageCallback = (
  error: Error | null,
  info?: Partial<UploadedImageFile>,
) => void;

export class TotalSizeLimitedMemoryStorage implements StorageEngine {
  private readonly receivedBytes = new WeakMap<Request, number>();

  constructor(
    private readonly maxTotalBytes: number,
    private readonly admission?: ImageUploadAdmission,
  ) {}

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
      finish(null, {
        bytes: new UploadBytes(Buffer.concat(chunks, size)),
        size,
      });
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
      if (this.admission && !this.admission.reserve(request, chunk.length)) {
        request.res?.setHeader(
          'Retry-After',
          String(IMAGE_UPLOAD_RETRY_AFTER_SECONDS),
        );
        finish(new ImageUploadsBusyException());
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
    (file as Partial<UploadedImageFile>).bytes?.drop();
    callback(null);
  }
}
