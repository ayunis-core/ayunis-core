import { PassThrough } from 'node:stream';
import type { Request } from 'express';
import type { TotalSizeLimitedMemoryStorage } from './total-size-limited-memory.storage';
import { IMAGE_UPLOAD_OPTIONS } from './image-upload.options';
import {
  MAX_IMAGE_SIZE_BYTES,
  MAX_TOTAL_SIZE_BYTES,
} from './image-upload.constants';

const storage = IMAGE_UPLOAD_OPTIONS.storage as TotalSizeLimitedMemoryStorage;

function upload(request: Request, bytes: Buffer): Promise<void> {
  const stream = new PassThrough();
  const file = { stream };
  return new Promise((resolve, reject) => {
    storage._handleFile(request, file, (error: Error | null) => {
      if (error) reject(error);
      else resolve();
    });
    stream.end(bytes);
  });
}

it('rejects the aggregate overflow before the overflowing file finishes', async () => {
  const request = {} as Request;
  const bytes = Buffer.alloc(MAX_IMAGE_SIZE_BYTES);
  for (let size = 0; size < MAX_TOTAL_SIZE_BYTES; size += bytes.length) {
    await upload(request, bytes);
  }
  const stream = new PassThrough();
  const callback = jest.fn();
  storage._handleFile(request, { stream }, callback);
  try {
    stream.write(Buffer.alloc(1));
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ status: 413 }),
      undefined,
    );
  } finally {
    stream.end();
  }
});
