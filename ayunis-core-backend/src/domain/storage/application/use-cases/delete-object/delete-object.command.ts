export class DeleteObjectCommand {
  constructor(
    public readonly objectName: string,
    public readonly bucket?: string,
  ) {}
}
