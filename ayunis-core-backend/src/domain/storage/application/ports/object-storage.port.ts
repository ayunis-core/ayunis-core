import type { StorageObject } from 'src/domain/storage/domain/storage-object.entity';
import type { StorageObjectUpload } from 'src/domain/storage/domain/storage-object-upload.entity';
import type { StorageBucket } from 'src/domain/storage/domain/storage-bucket.entity';
import type { StorageUrl } from 'src/domain/storage/domain/storage-url.entity';

/** An object's key plus the metadata needed to age it against a safety window. */
export interface StorageObjectSummary {
  objectName: string;
  lastModified?: Date;
}

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

  /**
   * List objects in the storage with an optional prefix filter
   *
   * @param prefix Optional prefix to filter objects (e.g., 'orgId/' or 'orgId/threadId/')
   * @param bucket Optional bucket name (uses default if not provided)
   * @returns Array of object names matching the prefix
   */
  abstract listObjects(prefix?: string, bucket?: string): Promise<string[]>;

  /**
   * List objects with the metadata needed to age them against a safety window.
   *
   * @param prefix Optional prefix to filter objects
   * @param bucket Optional bucket name (uses default if not provided)
   * @returns Array of object summaries (key + last-modified time) matching the prefix
   */
  abstract listObjectsWithMetadata(
    prefix?: string,
    bucket?: string,
  ): Promise<StorageObjectSummary[]>;
}
