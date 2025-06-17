export class UploadObjectCommand {
  constructor(
    public readonly objectName: string,
    public readonly data: Buffer | NodeJS.ReadableStream,
    public readonly options?: Record<string, string | undefined>,
    public readonly bucket?: string,
  ) {}
}
