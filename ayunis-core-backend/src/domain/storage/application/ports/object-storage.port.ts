import { StorageObject } from '../../domain/storage-object.entity';
import { StorageObjectUpload } from '../../domain/storage-object-upload.entity';
import { StorageBucket } from '../../domain/storage-bucket.entity';
import { StorageUrl } from '../../domain/storage-url.entity';
import { PresignedUrl } from '../../domain/presigned-url.entity';

export abstract class ObjectStoragePort {
  /**
   * Upload a file to the storage
   *
   * @param uploadObject The object to upload
   * @returns Information about the uploaded object
   */
  abstract upload(uploadObject: StorageObjectUpload): Promise<StorageObject>;

  /**
   * Download a file from the storage
   *
   * @param storageUrl Reference to the object to download
   * @returns A readable stream containing the object data
   */
  abstract download(storageUrl: StorageUrl): Promise<NodeJS.ReadableStream>;

  /**
   * Get object info without downloading the actual data
   *
   * @param storageUrl Reference to the object
   * @returns Information about the storage object
   */
  abstract getObjectInfo(storageUrl: StorageUrl): Promise<StorageObject>;

  /**
   * Delete an object from the storage
   *
   * @param storageUrl Reference to the object to delete
   */
  abstract delete(storageUrl: StorageUrl): Promise<void>;

  /**
   * Check if an object exists in the storage
   *
   * @param storageUrl Reference to the object
   * @returns True if the object exists, false otherwise
   */
  abstract exists(storageUrl: StorageUrl): Promise<boolean>;

  /**
   * Generate a presigned URL for an object
   *
   * @param storageUrl Reference to the object
   * @param expiresIn Expiration time in seconds
   * @returns A presigned URL with expiration information
   */
  abstract getPresignedUrl(
    storageUrl: StorageUrl,
    expiresIn?: number,
  ): Promise<PresignedUrl>;

  /**
   * List all buckets in the storage
   *
   * @returns Array of storage buckets
   */
  abstract listBuckets(): Promise<StorageBucket[]>;

  /**
   * Create a new bucket in the storage
   *
   * @param name Name of the bucket to create
   * @param region Optional region for the bucket
   * @returns Information about the created bucket
   */
  abstract createBucket(name: string, region?: string): Promise<StorageBucket>;

  /**
   * Check if a bucket exists
   *
   * @param name Name of the bucket
   * @returns True if the bucket exists, false otherwise
   */
  abstract bucketExists(name: string): Promise<boolean>;

  /**
   * Delete a bucket from the storage
   *
   * @param name Name of the bucket to delete
   */
  abstract deleteBucket(name: string): Promise<void>;
}
