export class ListIncompleteUploadsCommand {
  constructor(
    public readonly prefix: string,
    public readonly bucket?: string,
  ) {}
}
