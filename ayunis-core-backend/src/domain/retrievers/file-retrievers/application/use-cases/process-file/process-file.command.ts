export class ProcessFileCommand {
  constructor(
    public readonly fileData: Buffer,
    public readonly fileName: string,
  ) {}
}
