export class ListObjectsCommand {
  constructor(
    public readonly prefix: string,
    public readonly bucket?: string,
  ) {}
}
