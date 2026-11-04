import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import * as Minio from 'minio';
import { AwsV4Signer } from 'aws4fetch';
import { Readable } from 'stream';
import type { IncomingMessage } from 'http';
import {
  ObjectStoragePort,
  type StorageObjectSummary,
} from 'src/domain/storage/application/ports/object-storage.port';
import type {
  IncompleteUpload,
  UploadRequest,
} from 'src/domain/storage/domain/multipart-upload.object';
import storageConfig from 'src/config/storage.config';
import { StorageObjectUpload } from 'src/domain/storage/domain/storage-object-upload.entity';
import { StorageObject } from 'src/domain/storage/domain/storage-object.entity';
import { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';
import { StorageBucket } from 'src/domain/storage/domain/storage-bucket.entity';
import {
  ObjectChangedError,
  ObjectNotFoundError,
} from 'src/domain/storage/application/storage.errors';

/**
 * S3 error codes minio raises for a key that is not there. `NotFound` comes
 * back from HEAD-style calls, `NoSuchKey` from GETs.
 */
const MISSING_OBJECT_CODES = new Set(['NoSuchKey', 'NotFound']);

function isMissingObjectError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code !== undefined && MISSING_OBJECT_CODES.has(code);
}

@Injectable()
export class MinioObjectStorageProvider
  extends ObjectStoragePort
  implements OnModuleInit
{
  private readonly logger = new Logger(MinioObjectStorageProvider.name);

  private readonly internalClient: Minio.Client;
  private signingRegion: Promise<string> | null = null;
  private defaultBucket: string;

  constructor(
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {
    super();
    this.defaultBucket = this.config.minio.bucket;
    this.internalClient = new Minio.Client({
      ...this.config.minio.internal,
      ...this.credentials(),
    });
  }

  private credentials(): { accessKey: string; secretKey: string } {
    return {
      accessKey: this.config.minio.accessKey,
      secretKey: this.config.minio.secretKey,
    };
  }

  private getSigningRegion(bucket: string): Promise<string> {
    this.signingRegion ??= this.internalClient
      .getBucketRegionAsync(bucket)
      .catch((error: unknown) => {
        this.signingRegion = null;
        throw error;
      });
    return this.signingRegion;
  }

  async onModuleInit(): Promise<void> {
    try {
      // Add retry logic for MinIO connection
      await this.connectWithRetry();
    } catch (error) {
      this.logger.error(
        { err: error as Error },
        'Failed to initialize MinIO after retries',
      );
      // Don't throw - let the application start and handle MinIO errors per request
    }
  }

  private async connectWithRetry(maxRetries = 10, delay = 2000): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log({ attempt, maxRetries }, 'Connecting to MinIO');
        const bucketExists = await this.internalClient.bucketExists(
          this.defaultBucket,
        );
        if (!bucketExists) {
          await this.internalClient.makeBucket(
            this.defaultBucket,
            'eu-central-1',
          );
          this.logger.log(
            { bucket: this.defaultBucket },
            'Created MinIO bucket',
          );
        }
        this.logger.log('MinIO connection successful');
        return;
      } catch (error) {
        this.logger.warn(
          { attempt, err: error as Error },
          'MinIO connection attempt failed',
        );
        if (attempt === maxRetries) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async upload(
    uploadObject: StorageObjectUpload,
    bucket?: string,
  ): Promise<StorageObject> {
    const bucketName = bucket ?? this.defaultBucket;
    const metaData = uploadObject.metadata.toRawMetadata();

    if (uploadObject.metadata.contentType) {
      metaData['Content-Type'] = uploadObject.metadata.contentType;
    }

    // Convert NodeJS.ReadableStream to Readable if needed
    const stream = Buffer.isBuffer(uploadObject.data)
      ? uploadObject.data
      : (uploadObject.data as Readable);

    const size = Buffer.isBuffer(uploadObject.data)
      ? uploadObject.data.length
      : undefined;

    const result = await this.internalClient.putObject(
      bucketName,
      uploadObject.objectName,
      stream,
      size,
      metaData,
    );

    const stat = await this.internalClient.statObject(
      bucketName,
      uploadObject.objectName,
    );

    return new StorageObject(
      uploadObject.objectName,
      bucketName,
      stat.size,
      result.etag,
      stat.metaData,
      stat.lastModified,
    );
  }

  async download(
    storageUrl: StorageUrl,
    expectedETag?: string,
  ): Promise<NodeJS.ReadableStream> {
    const bucketName = storageUrl.bucket || this.defaultBucket;
    try {
      const response = await this.internalClient.getObject(
        bucketName,
        storageUrl.objectName,
      );
      // Bind verification to this GET, not a separate HEAD that could race a PUT.
      const etag = (response as Partial<IncomingMessage>).headers?.etag;
      if (expectedETag !== undefined && etag !== `"${expectedETag}"`) {
        response.destroy();
        throw new ObjectChangedError();
      }
      return response;
    } catch (error) {
      // Without this translation a missing object is indistinguishable from
      // storage being unreachable, and callers turn both into a 500.
      if (isMissingObjectError(error)) {
        throw new ObjectNotFoundError({
          objectName: storageUrl.objectName,
          bucket: bucketName,
        });
      }
      throw error;
    }
  }

  async getObjectInfo(storageUrl: StorageUrl): Promise<StorageObject> {
    const bucketName = storageUrl.bucket || this.defaultBucket;

    try {
      const stat = await this.internalClient.statObject(
        bucketName,
        storageUrl.objectName,
      );

      return new StorageObject(
        storageUrl.objectName,
        bucketName,
        stat.size,
        stat.etag,
        stat.metaData,
        stat.lastModified,
      );
    } catch (error) {
      if (isMissingObjectError(error)) {
        throw new ObjectNotFoundError({
          objectName: storageUrl.objectName,
          bucket: bucketName,
        });
      }
      throw error;
    }
  }

  async delete(storageUrl: StorageUrl): Promise<void> {
    const bucketName = storageUrl.bucket || this.defaultBucket;
    await this.internalClient.removeObject(bucketName, storageUrl.objectName);
  }

  async exists(storageUrl: StorageUrl): Promise<boolean> {
    const bucketName = storageUrl.bucket || this.defaultBucket;

    try {
      await this.internalClient.statObject(bucketName, storageUrl.objectName);
      return true;
    } catch (error) {
      if (isMissingObjectError(error)) {
        return false;
      }
      throw error;
    }
  }

  async listBuckets(): Promise<StorageBucket[]> {
    const buckets = await this.internalClient.listBuckets();
    return buckets.map((bucket) => new StorageBucket(bucket.name));
  }

  async createBucket(name: string, region?: string): Promise<StorageBucket> {
    await this.internalClient.makeBucket(name, region);
    return new StorageBucket(name);
  }

  async bucketExists(name: string): Promise<boolean> {
    return this.internalClient.bucketExists(name);
  }

  async deleteBucket(name: string): Promise<void> {
    await this.internalClient.removeBucket(name);
  }

  async listObjects(prefix?: string, bucket?: string): Promise<string[]> {
    const objects = await this.listObjectsWithMetadata(prefix, bucket);
    return objects.map((object) => object.objectName);
  }

  async listObjectsWithMetadata(
    prefix?: string,
    bucket?: string,
  ): Promise<StorageObjectSummary[]> {
    const bucketName = bucket ?? this.defaultBucket;
    const objects: StorageObjectSummary[] = [];

    return new Promise((resolve, reject) => {
      const stream = this.internalClient.listObjects(bucketName, prefix, true);

      stream.on('data', (obj) => {
        if (obj.name) {
          objects.push({
            objectName: obj.name,
            lastModified: obj.lastModified,
          });
        }
      });

      stream.on('error', (err) => {
        reject(err);
      });

      stream.on('end', () => {
        resolve(objects);
      });
    });
  }

  async presignUploadRequest(
    storageUrl: StorageUrl,
    request: UploadRequest,
    expiresInSeconds: number,
  ): Promise<string> {
    this.validateUploadSignature(request, expiresInSeconds);
    const bucketName = storageUrl.bucket || this.defaultBucket;
    const region = await this.getSigningRegion(bucketName);
    const url = this.uploadUrl(
      bucketName,
      storageUrl.objectName,
      request.query,
      expiresInSeconds,
    );
    const signed = await new AwsV4Signer({
      url: url.toString(),
      method: request.method,
      service: 's3',
      region,
      accessKeyId: this.config.minio.accessKey,
      secretAccessKey: this.config.minio.secretKey,
      signQuery: true,
      allHeaders: true,
      headers:
        request.contentLength === undefined
          ? {}
          : { 'content-length': String(request.contentLength) },
    }).sign();
    return signed.url.toString();
  }

  private validateUploadSignature(
    request: UploadRequest,
    expiresInSeconds: number,
  ): void {
    if (
      !Number.isSafeInteger(expiresInSeconds) ||
      expiresInSeconds < 1 ||
      expiresInSeconds > 604800
    )
      throw new Error('Invalid upload URL expiry');
    if (
      request.contentLength !== undefined &&
      (!Number.isSafeInteger(request.contentLength) ||
        request.contentLength < 1)
    )
      throw new Error('Invalid upload content length');
    if (!this.config.minio.accessKey || !this.config.minio.secretKey)
      throw new Error('Storage credentials are required to sign uploads');
  }

  private uploadUrl(
    bucket: string,
    key: string,
    query: Record<string, string>,
    expires: number,
  ): URL {
    const endpoint = this.config.minio.public;
    const host = endpoint.endPoint.includes(':')
      ? `[${endpoint.endPoint}]`
      : endpoint.endPoint;
    const url = new URL(`${endpoint.useSSL ? 'https' : 'http'}://${host}`);
    url.port = String(endpoint.port);
    const pathname = `/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
    url.pathname = pathname;
    if (url.pathname !== pathname)
      throw new Error(
        'Storage key contains path segments that cannot be signed safely',
      );
    for (const [name, value] of Object.entries(query))
      url.searchParams.set(name, value);
    url.searchParams.set('X-Amz-Expires', String(expires));
    return url;
  }

  async abortMultipartUpload(
    storageUrl: StorageUrl,
    uploadId: string,
  ): Promise<void> {
    await this.internalClient.abortMultipartUpload(
      storageUrl.bucket || this.defaultBucket,
      storageUrl.objectName,
      uploadId,
    );
  }

  async listIncompleteUploads(
    prefix: string,
    bucket?: string,
  ): Promise<IncompleteUpload[]> {
    const bucketName = bucket ?? this.defaultBucket;
    const uploads: IncompleteUpload[] = [];

    return new Promise((resolve, reject) => {
      const stream = this.internalClient.listIncompleteUploads(
        bucketName,
        prefix,
        true,
      );
      stream.on('data', (item) => {
        uploads.push({ objectName: item.key, uploadId: item.uploadId });
      });
      stream.on('error', reject);
      stream.on('end', () => resolve(uploads));
    });
  }
}
