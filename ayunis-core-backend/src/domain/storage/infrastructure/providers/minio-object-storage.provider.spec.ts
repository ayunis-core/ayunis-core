import type { ConfigType } from '@nestjs/config';
import * as Minio from 'minio';
import type storageConfig from 'src/config/storage.config';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';
import { MinioObjectStorageProvider } from './minio-object-storage.provider';

interface InspectableMinioClient {
  host: string;
  port: number;
}

function endpointOf(client: unknown): { host: string; port: number } {
  const inspected = client as InspectableMinioClient;
  return { host: inspected.host, port: inspected.port };
}

describe('MinioObjectStorageProvider', () => {
  const config = {
    provider: 'minio',
    defaultBucket: 'test-bucket',
    minio: {
      internal: {
        endPoint: 'internal-minio',
        port: 9000,
        useSSL: false,
      },
      public: {
        endPoint: 'storage.example.com',
        port: 443,
        useSSL: true,
      },
      accessKey: 'test-access-key',
      secretKey: 'test-secret-key',
      bucket: 'test-bucket',
    },
  } satisfies ConfigType<typeof storageConfig>;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deletes through the internal endpoint when the public endpoint differs', async () => {
    const removeObject = jest
      .spyOn(Minio.Client.prototype, 'removeObject')
      .mockResolvedValue(undefined);
    const provider = new MinioObjectStorageProvider(config);

    await provider.delete(new StorageUrl('objects/file.txt', 'test-bucket'));

    expect(removeObject).toHaveBeenCalledWith(
      'test-bucket',
      'objects/file.txt',
    );
    expect(endpointOf(removeObject.mock.instances[0])).toEqual({
      host: 'internal-minio',
      port: 9000,
    });
  });

  it('generates a valid signed browser URL for the public endpoint', async () => {
    const provider = new MinioObjectStorageProvider(config);

    const result = await provider.getPresignedUrl(
      new StorageUrl('objects/file.txt', 'test-bucket'),
      300,
    );
    const url = new URL(result.url);

    expect(url.origin).toBe('https://storage.example.com');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy();
  });
});
