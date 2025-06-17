export class UrlRetrieverResult {
  constructor(
    public readonly content: string,
    public readonly url: string,
    public readonly metadata: Record<string, any> = {},
  ) {}
}
