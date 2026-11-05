export class AbortMultipartUploadCommand {
  constructor(
    public readonly objectName: string,
    public readonly uploadId: string,
    public readonly bucket?: string,
  ) {}
}
