export class GetPresignedUrlCommand {
  constructor(
    public readonly objectName: string,
    public readonly expiresIn: number,
    public readonly bucket?: string,
  ) {}
}
