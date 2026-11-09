export class ListObjectSummariesCommand {
  constructor(
    public readonly prefix: string,
    public readonly bucket?: string,
  ) {}
}
