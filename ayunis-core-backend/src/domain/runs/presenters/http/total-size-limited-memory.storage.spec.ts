import { PassThrough } from 'node:stream';
import type { Request } from 'express';
import { TotalSizeLimitedMemoryStorage } from './total-size-limited-memory.storage';
import { UploadBytes, type UploadedImageFile } from './upload-bytes';

const LIMIT = 1024;

function receive(
  storage: TotalSizeLimitedMemoryStorage,
  request: Request,
  bytes: Buffer,
) {
  const stream = new PassThrough();
  return new Promise<Partial<UploadedImageFile>>((resolve, reject) => {
    storage._handleFile(request, { stream }, (error, file) => {
      if (error) reject(error);
      else resolve(file!);
    });
    stream.end(bytes);
  });
}

it('accepts exactly the aggregate limit across files without mixing requests', async () => {
  const storage = new TotalSizeLimitedMemoryStorage(LIMIT);
  const firstRequest = {} as Request;
  const bytes = Buffer.alloc(LIMIT / 2, 42);
  await receive(storage, firstRequest, bytes);
  const second = await receive(storage, firstRequest, bytes);
  expect(second.size).toBe(bytes.length);
  expect(second.bytes?.take()).toEqual(bytes);
  expect(
    await receive(storage, {} as Request, Buffer.alloc(LIMIT)),
  ).toHaveProperty('size', LIMIT);
  await expect(
    receive(storage, firstRequest, Buffer.alloc(1)),
  ).rejects.toMatchObject({ status: 413 });
});

it('reports a stream failure once and retains no unfinished file buffer', async () => {
  const storage = new TotalSizeLimitedMemoryStorage(LIMIT);
  const stream = new PassThrough();
  const callback = jest.fn();
  storage._handleFile({} as Request, { stream }, callback);
  stream.write(Buffer.alloc(LIMIT / 2));
  const error = new Error('Client disconnected');
  stream.destroy(error);
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(callback.mock.calls).toEqual([[error, undefined]]);
});

it('removes completed buffers during Multer rollback', () => {
  const storage = new TotalSizeLimitedMemoryStorage(LIMIT);
  const bytes = new UploadBytes(Buffer.alloc(LIMIT));
  const file = { bytes } as unknown as Express.Multer.File;
  const callback = jest.fn();
  storage._removeFile({} as Request, file, callback);
  expect(bytes.isEmpty).toBe(true);
  expect(callback).toHaveBeenCalledWith(null);
});
