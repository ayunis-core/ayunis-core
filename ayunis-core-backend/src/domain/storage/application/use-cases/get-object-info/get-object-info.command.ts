export class GetObjectInfoCommand {
  constructor(
    public readonly objectName: string,
    public readonly bucket?: string,
  ) {}
}
