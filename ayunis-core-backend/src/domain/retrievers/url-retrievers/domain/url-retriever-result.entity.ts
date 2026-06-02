export class UrlRetrieverResult {
  constructor(
    public readonly content: string,
    public readonly url: string,
    public readonly websiteTitle: string,
    public readonly metadata: Record<string, unknown> = {},
    /**
     * Absolute http(s) URLs discovered in the page's anchor tags.
     * Used by the crawler to follow links up to a configured depth.
     */
    public readonly links: string[] = [],
  ) {}
}
