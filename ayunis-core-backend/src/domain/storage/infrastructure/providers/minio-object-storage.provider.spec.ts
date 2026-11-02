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
    defaultBucket: 'generated-images',
    minio: {
      internal: {
        endPoint: 'minio.internal',
        port: 443,
        useSSL: true,
      },
      accessKey: 'storage-access-key',
      secretKey: 'storage-secret-key',
      bucket: 'generated-images',
    },
  } satisfies ConfigType<typeof storageConfig>;

  let provider: MinioObjectStorageProvider;
  let statObject: jest.Mock;

  beforeEach(() => {
    provider = new MinioObjectStorageProvider(config);
    statObject = jest.fn();
    (
      provider as unknown as {
        internalClient: { statObject: typeof statObject };
      }
    ).internalClient.statObject = statObject;
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
        new Error('connect ECONNREFUSED minio.internal'),
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

  it('deletes through the internal endpoint', async () => {
    const removeObject = jest
      .spyOn(Minio.Client.prototype, 'removeObject')
      .mockResolvedValue(undefined);

    await provider.delete(
      new StorageUrl(
        'generated-images/org/thread/image.png',
        'generated-images',
      ),
    );

    expect(removeObject).toHaveBeenCalledWith(
      'generated-images',
      'generated-images/org/thread/image.png',
    );
    expect(endpointOf(removeObject.mock.instances[0])).toEqual({
      host: 'minio.internal',
      port: 443,
    });
  });
});
