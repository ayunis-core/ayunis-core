export class UploadObjectCommand {
  constructor(
    public readonly objectName: string,
    public readonly data: Buffer | NodeJS.ReadableStream,
    public readonly options?: Record<string, string | undefined>,
    public readonly bucket?: string,
    /** Byte length of a streamed `data`; lets the provider pick a single PUT over multipart. */
    public readonly size?: number,
  ) {}
}
