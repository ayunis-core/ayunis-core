import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigType } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';
import {
  ObjectStoragePort,
  type PresignedUrlResponseOverrides,
  type StorageObjectSummary,
} from '../../application/ports/object-storage.port';
import storageConfig from 'src/config/storage.config';
import { StorageObjectUpload } from '../../domain/storage-object-upload.entity';
import { StorageObject } from '../../domain/storage-object.entity';
import { StorageUrl } from '../../domain/storage-url.entity';
import { PresignedUrl } from '../../domain/presigned-url.entity';
import { StorageBucket } from '../../domain/storage-bucket.entity';
import { ObjectNotFoundError } from '../../application/storage.errors';

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
  private client: Minio.Client;
  private defaultBucket: string;

  constructor(
    @InjectPinoLogger(MinioObjectStorageProvider.name)
    private readonly logger: PinoLogger,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {
    super();
    this.defaultBucket = this.config.minio.bucket;
    this.client = new Minio.Client({
      endPoint: this.config.minio.endPoint,
      port: this.config.minio.port,
      useSSL: this.config.minio.useSSL,
      accessKey: this.config.minio.accessKey,
      secretKey: this.config.minio.secretKey,
    });
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
        this.logger.info({ attempt, maxRetries }, 'Connecting to MinIO');
        const bucketExists = await this.client.bucketExists(this.defaultBucket);
        if (!bucketExists) {
          await this.client.makeBucket(this.defaultBucket, 'eu-central-1');
          this.logger.info(
            { bucket: this.defaultBucket },
            'Created MinIO bucket',
          );
        }
        this.logger.info('MinIO connection successful');
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

    const result = await this.client.putObject(
      bucketName,
      uploadObject.objectName,
      stream,
      size,
      metaData,
    );

    const stat = await this.client.statObject(
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

  async download(storageUrl: StorageUrl): Promise<NodeJS.ReadableStream> {
    const bucketName = storageUrl.bucket || this.defaultBucket;
    try {
      return await this.client.getObject(bucketName, storageUrl.objectName);
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
      const stat = await this.client.statObject(
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
      if (error instanceof Error && error.message.includes('not found')) {
        throw new Error(
          `Object '${storageUrl.objectName}' not found in bucket '${bucketName}'`,
        );
      }
      throw error;
    }
  }

  async delete(storageUrl: StorageUrl): Promise<void> {
    const bucketName = storageUrl.bucket || this.defaultBucket;
    await this.client.removeObject(bucketName, storageUrl.objectName);
  }

  async exists(storageUrl: StorageUrl): Promise<boolean> {
    const bucketName = storageUrl.bucket || this.defaultBucket;

    try {
      await this.client.statObject(bucketName, storageUrl.objectName);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return false;
      }
      throw error;
    }
  }

  async getPresignedUrl(
    storageUrl: StorageUrl,
    expiresIn = 60 * 60,
    responseOverrides?: PresignedUrlResponseOverrides,
  ): Promise<PresignedUrl> {
    const bucketName = storageUrl.bucket || this.defaultBucket;
    const respHeaders: Record<string, string> = {};
    if (responseOverrides?.contentType) {
      respHeaders['response-content-type'] = responseOverrides.contentType;
    }
    if (responseOverrides?.contentDisposition) {
      respHeaders['response-content-disposition'] =
        responseOverrides.contentDisposition;
    }
    const hasOverrides = Object.keys(respHeaders).length > 0;

    const url = hasOverrides
      ? await this.client.presignedGetObject(
          bucketName,
          storageUrl.objectName,
          expiresIn,
          respHeaders,
        )
      : await this.client.presignedGetObject(
          bucketName,
          storageUrl.objectName,
          expiresIn,
        );

    return new PresignedUrl(url, expiresIn, storageUrl);
  }

  async listBuckets(): Promise<StorageBucket[]> {
    const buckets = await this.client.listBuckets();
    return buckets.map((bucket) => new StorageBucket(bucket.name));
  }

  async createBucket(name: string, region?: string): Promise<StorageBucket> {
    await this.client.makeBucket(name, region);
    return new StorageBucket(name);
  }

  async bucketExists(name: string): Promise<boolean> {
    return this.client.bucketExists(name);
  }

  async deleteBucket(name: string): Promise<void> {
    await this.client.removeBucket(name);
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
      const stream = this.client.listObjects(bucketName, prefix, true);

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
}
