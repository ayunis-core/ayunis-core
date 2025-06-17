export class File {
  constructor(
    public readonly fileData: Buffer,
    public readonly filename: string,
  ) {}
}
