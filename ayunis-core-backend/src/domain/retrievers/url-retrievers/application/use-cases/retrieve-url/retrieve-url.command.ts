export class RetrieveUrlCommand {
  constructor(
    public readonly url: string,
    public readonly options?: Record<string, any>,
  ) {}
}
