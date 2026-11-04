import type { ConfigType } from '@nestjs/config';
import * as Minio from 'minio';
import { PassThrough } from 'stream';
import type storageConfig from 'src/config/storage.config';
import { ObjectNotFoundError } from 'src/domain/storage/application/storage.errors';
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
      public: {
        endPoint: 'cdn.example.org',
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

  describe('verified downloads', () => {
    it('rejects replacement bytes even when their size is unchanged', async () => {
      const response = Object.assign(new PassThrough(), {
        headers: { etag: '"replacement"' },
      });
      jest
        .spyOn(Minio.Client.prototype, 'getObject')
        .mockResolvedValue(response);
      const url = new StorageUrl('org/uploads/document.pdf', 'sources');

      await expect(provider.download(url, 'verified')).rejects.toThrow();
      expect(response.destroyed).toBe(true);
    });

    it('accepts the verified GET response without a separate metadata read', async () => {
      const response = Object.assign(new PassThrough(), {
        headers: { etag: '"verified"' },
      });
      jest
        .spyOn(Minio.Client.prototype, 'getObject')
        .mockResolvedValue(response);
      const url = new StorageUrl('org/uploads/document.pdf', 'sources');

      await expect(provider.download(url, 'verified')).resolves.toBe(response);
      expect(statObject).not.toHaveBeenCalled();
    });

    it('fails closed when the download has no identity header', async () => {
      const response = new PassThrough();
      jest
        .spyOn(Minio.Client.prototype, 'getObject')
        .mockResolvedValue(response);
      const url = new StorageUrl('org/uploads/document.pdf', 'sources');

      await expect(provider.download(url, 'verified')).rejects.toThrow();
      expect(response.destroyed).toBe(true);
    });
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

  it('reports a missing object as ObjectNotFoundError on stat', async () => {
    statObject.mockRejectedValue(
      Object.assign(new Error('Not Found'), { code: 'NotFound' }),
    );

    await expect(
      provider.getObjectInfo(new StorageUrl('org/uploads/s/f.pdf', 'bucket')),
    ).rejects.toBeInstanceOf(ObjectNotFoundError);
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

  // The bucket region is resolved through the internal client only; the
  // signing client is pinned to it, so its own lookup stays local and a
  // public host that does not resolve (cdn.example.org) never breaks signing.
  function stubInternalRegionLookup(): jest.Mock {
    const getBucketRegion = jest.fn().mockResolvedValue('us-east-1');
    (
      provider as unknown as {
        internalClient: { getBucketRegionAsync: jest.Mock };
      }
    ).internalClient.getBucketRegionAsync = getBucketRegion;
    return getBucketRegion;
  }

  it('signs browser upload URLs against the public endpoint without a request', async () => {
    const getBucketRegion = stubInternalRegionLookup();
    const url = await provider.presignUploadRequest(
      new StorageUrl('org/uploads/session/file.pdf', 'generated-images'),
      { method: 'PUT', query: {} },
      900,
    );

    expect(url).toMatch(/^https:\/\/cdn\.example\.org\//);
    expect(url).toContain('X-Amz-Expires=900');
    expect(url).toContain('us-east-1');
    expect(getBucketRegion).toHaveBeenCalledWith('generated-images');
    expect(statObject).not.toHaveBeenCalled();
  });

  it('signs multipart step URLs with their query parameters', async () => {
    stubInternalRegionLookup();
    const url = await provider.presignUploadRequest(
      new StorageUrl('org/uploads/session/file.pdf', 'generated-images'),
      { method: 'PUT', query: { uploadId: 'upload-123', partNumber: '2' } },
      900,
    );

    expect(url).toMatch(/^https:\/\/cdn\.example\.org\//);
    expect(url).toContain('uploadId=upload-123');
    expect(url).toContain('partNumber=2');
  });

  it('signs the exact content length so a different upload size invalidates the signature', async () => {
    stubInternalRegionLookup();
    const target = new StorageUrl(
      'org/uploads/session/file.pdf',
      'generated-images',
    );
    const first = new URL(
      await provider.presignUploadRequest(
        target,
        { method: 'PUT', query: {}, contentLength: 3 },
        900,
      ),
    );
    const second = new URL(
      await provider.presignUploadRequest(
        target,
        { method: 'PUT', query: {}, contentLength: 4 },
        900,
      ),
    );
    expect(first.searchParams.get('X-Amz-SignedHeaders')).toBe(
      'content-length;host',
    );
    expect(first.searchParams.get('X-Amz-Signature')).not.toBe(
      second.searchParams.get('X-Amz-Signature'),
    );
  });

  it.each(['org/uploads/session/.', 'org/uploads/session/..'])(
    'refuses a legacy key whose path would be normalized: %s',
    async (key) => {
      stubInternalRegionLookup();
      await expect(
        provider.presignUploadRequest(
          new StorageUrl(key, 'generated-images'),
          { method: 'PUT', query: {}, contentLength: 3 },
          900,
        ),
      ).rejects.toThrow('cannot be signed');
    },
  );

  it('aborts multipart uploads through the internal endpoint', async () => {
    const abort = jest
      .spyOn(Minio.Client.prototype, 'abortMultipartUpload')
      .mockResolvedValue(undefined);

    await provider.abortMultipartUpload(
      new StorageUrl('org/uploads/session/file.pdf', 'generated-images'),
      'upload-123',
    );

    expect(abort).toHaveBeenCalledWith(
      'generated-images',
      'org/uploads/session/file.pdf',
      'upload-123',
    );
    expect(endpointOf(abort.mock.instances[0])).toEqual({
      host: 'minio.internal',
      port: 443,
    });
  });
});
