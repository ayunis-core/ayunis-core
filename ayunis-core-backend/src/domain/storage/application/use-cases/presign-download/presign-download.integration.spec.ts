import 'src/config/env';
import { randomUUID } from 'crypto';
import { create as contentDisposition } from 'content-disposition';
import storageConfig from 'src/config/storage.config';
import { MinioObjectStorageProvider } from 'src/domain/storage/infrastructure/providers/minio-object-storage.provider';
import { StorageObjectUpload } from 'src/domain/storage/domain/storage-object-upload.entity';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';
import { PresignDownloadUseCase } from './presign-download.use-case';
import { PresignDownloadCommand } from './presign-download.command';

const EXPIRY_SECONDS = 300;
const WINDOW_SECONDS = 120;
const FILE_NAME = 'Bericht "Q1" – Übersicht 100%.pdf';

describe('signed downloads against MinIO', () => {
  const baseConfig = storageConfig();
  const config = {
    ...baseConfig,
    minio: { ...baseConfig.minio, bucket: `ayc1879-${randomUUID()}` },
  };
  const storage = new MinioObjectStorageProvider(config);
  const presign = new PresignDownloadUseCase(storage);
  const org = randomUUID();
  const key = `${org}/uploads/session/report.pdf`;
  const otherKey = `${org}/uploads/session/other.pdf`;
  const bytes = Buffer.from('%PDF-1.7 signed download fixture');
  const otherBytes = Buffer.from('%PDF-1.7 a different object');

  const sign = (objectName = key) =>
    presign.execute(
      new PresignDownloadCommand(objectName, EXPIRY_SECONDS, WINDOW_SECONDS, {
        contentType: 'application/pdf',
        fileName: FILE_NAME,
      }),
    );

  const signAt = async (time: number) => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(time);
    try {
      return await sign();
    } finally {
      now.mockRestore();
    }
  };

  const storedBytes = async (objectName: string) => {
    const chunks: Buffer[] = [];
    for await (const chunk of await storage.download(
      new StorageUrl(objectName, config.minio.bucket),
    ))
      chunks.push(Buffer.from(chunk as Buffer));
    return Buffer.concat(chunks);
  };

  beforeAll(async () => {
    await storage.createBucket(config.minio.bucket);
    await storage.upload(new StorageObjectUpload(key, bytes));
    await storage.upload(new StorageObjectUpload(otherKey, otherBytes));
  });

  afterAll(async () => {
    for (const objectName of await storage.listObjects(
      undefined,
      config.minio.bucket,
    ))
      await storage.delete(new StorageUrl(objectName, config.minio.bucket));
    await storage.deleteBucket(config.minio.bucket);
  });

  it('serves the bytes with the signed type and filename to a holder without credentials', async () => {
    const response = await fetch(await sign());

    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toBe(
      contentDisposition(FILE_NAME),
    );
  });

  it('does not let the URL read a different object', async () => {
    const url = new URL(await sign());
    url.pathname = url.pathname.replace('report.pdf', 'other.pdf');

    const response = await fetch(url);

    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain(otherBytes.toString());
  });

  it.each(['PUT', 'DELETE'])(
    'does not let the URL %s the object',
    async (method) => {
      const response = await fetch(await sign(), {
        method,
        body: method === 'PUT' ? 'overwritten' : undefined,
      });

      expect(response.status).toBe(403);
      expect(await storedBytes(key)).toEqual(bytes);
    },
  );

  it.each([
    ['a changed response type', 'response-content-type', 'text/html'],
    ['a changed filename', 'response-content-disposition', 'inline'],
    ['a longer expiry', 'X-Amz-Expires', '604800'],
    ['an added parameter', 'versionId', 'null'],
  ])('rejects the URL with %s', async (_case, name, value) => {
    const url = new URL(await sign());
    url.searchParams.set(name, value);

    expect((await fetch(url)).status).toBe(403);
  });

  it('rejects the URL once it has expired', async () => {
    const url = await signAt(Date.now() - (EXPIRY_SECONDS + 60) * 1000);

    const response = await fetch(url);

    expect(response.status).toBe(403);
    expect(await response.text()).toContain('expired');
  });

  it('returns the identical URL within one signing window and a new one in the next', async () => {
    const windowMs = WINDOW_SECONDS * 1000;
    const windowStart = Math.floor(Date.now() / windowMs) * windowMs;

    const first = await signAt(windowStart);
    const retry = await signAt(windowStart + windowMs - 1);
    const next = await signAt(windowStart + windowMs);

    expect(retry).toBe(first);
    expect(next).not.toBe(first);
    expect((await fetch(first)).status).toBe(200);
  });
});
