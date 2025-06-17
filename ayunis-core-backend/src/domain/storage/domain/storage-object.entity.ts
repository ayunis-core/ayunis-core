import { ObjectMetadata } from './object-metadata.object';
import { StorageUrl } from './storage-url.entity';

export class StorageObject {
  readonly objectName: string;
  readonly bucket: string;
  readonly size: number;
  readonly etag: string;
  readonly lastModified?: Date;
  readonly metadata: ObjectMetadata;

  constructor(
    objectName: string,
    bucket: string,
    size: number,
    etag: string,
    metadata?: Record<string, string>,
    lastModified?: Date,
  ) {
    this.objectName = objectName;
    this.bucket = bucket;
    this.size = size;
    this.etag = etag;
    this.lastModified = lastModified;
    this.metadata = ObjectMetadata.fromRawMetadata(metadata);
  }

  get contentType(): string | undefined {
    return this.metadata.contentType;
  }

  get originalName(): string | undefined {
    return this.metadata.originalName;
  }

  toStorageUrl(): StorageUrl {
    return new StorageUrl(this.objectName, this.bucket);
  }
}
