export class StorageUrl {
  readonly objectName: string;
  readonly bucket: string;

  constructor(objectName: string, bucket: string) {
    this.objectName = objectName;
    this.bucket = bucket;
  }
}
