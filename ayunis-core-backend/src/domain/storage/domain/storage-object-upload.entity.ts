import { ObjectMetadata } from './object-metadata.object';

export class StorageObjectUpload {
  readonly objectName: string;
  readonly bucket: string;
  readonly data: Buffer | NodeJS.ReadableStream;
  readonly metadata: ObjectMetadata;
  /** Known byte length of a streamed `data`; a Buffer carries its own. */
  readonly size?: number;

  constructor(
    objectName: string,
    data: Buffer | NodeJS.ReadableStream,
    metadata?: Record<string, string | undefined>,
    bucket?: string,
    size?: number,
  ) {
    this.objectName = objectName;
    this.data = data;
    this.bucket = bucket ?? '';
    this.metadata = new ObjectMetadata(metadata ?? {});
    this.size = size;
  }
}
