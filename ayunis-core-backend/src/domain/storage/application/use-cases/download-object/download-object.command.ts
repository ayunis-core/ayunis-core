export class DownloadObjectCommand {
  constructor(
    public readonly objectName: string,
    public readonly bucket?: string,
  ) {}
}
