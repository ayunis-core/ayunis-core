import type { ConfigType } from '@nestjs/config';
import type storageConfig from 'src/config/storage.config';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';
import { MinioObjectStorageProvider } from './minio-object-storage.provider';

describe('MinioObjectStorageProvider', () => {
  let provider: MinioObjectStorageProvider;
  let statObject: jest.Mock;

  beforeEach(() => {
    const config = {
      minio: {
        endPoint: 'storage.example.com',
        port: 443,
        useSSL: true,
        accessKey: 'storage-access-key',
        secretKey: 'storage-secret-key',
        bucket: 'generated-images',
      },
    } as ConfigType<typeof storageConfig>;

    provider = new MinioObjectStorageProvider(config);
    statObject = jest.fn();
    (
      provider as unknown as {
        client: { statObject: typeof statObject };
      }
    ).client.statObject = statObject;
  });

  describe('exists', () => {
    const storageUrl = new StorageUrl(
      'generated-images/org/thread/image.png',
      'generated-images',
    );

    it('returns true when MinIO finds the object', async () => {
      statObject.mockResolvedValue({ size: 1024 });

      await expect(provider.exists(storageUrl)).resolves.toBe(true);
    });

    it.each(['NotFound', 'NoSuchKey'])(
      'returns false when MinIO reports %s',
      async (code) => {
        statObject.mockRejectedValue(
          Object.assign(new Error('MinIO object lookup failed'), { code }),
        );

        await expect(provider.exists(storageUrl)).resolves.toBe(false);
      },
    );

    it('preserves genuine storage failures', async () => {
      const storageFailure = Object.assign(
        new Error('connect ECONNREFUSED storage.example.com'),
        { code: 'ECONNREFUSED' },
      );
      statObject.mockRejectedValue(storageFailure);

      await expect(provider.exists(storageUrl)).rejects.toBe(storageFailure);
    });

    it('does not treat access errors as a missing object', async () => {
      const accessError = Object.assign(new Error('Access denied'), {
        code: 'AccessDenied',
      });
      statObject.mockRejectedValue(accessError);

      await expect(provider.exists(storageUrl)).rejects.toBe(accessError);
    });
  });
});
