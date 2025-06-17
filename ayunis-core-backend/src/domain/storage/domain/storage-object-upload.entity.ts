import { ObjectMetadata } from './object-metadata.object';

export class StorageObjectUpload {
  readonly objectName: string;
  readonly bucket: string;
  readonly data: Buffer | NodeJS.ReadableStream;
  readonly metadata: ObjectMetadata;

  constructor(
    objectName: string,
    data: Buffer | NodeJS.ReadableStream,
    metadata?: Record<string, string | undefined>,
    bucket?: string,
  ) {
    this.objectName = objectName;
    this.data = data;
    this.bucket = bucket || '';
    this.metadata = new ObjectMetadata(metadata || {});
  }
}
