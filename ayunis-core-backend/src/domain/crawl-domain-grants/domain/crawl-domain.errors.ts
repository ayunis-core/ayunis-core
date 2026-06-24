/**
 * Domain-layer validation error. Translated into an HTTP-mapped
 * `InvalidCrawlDomainApplicationError` by the application layer.
 */
export class InvalidCrawlDomainError extends Error {
  constructor(public readonly input: string) {
    super(`Invalid crawl domain: ${input}`);
    this.name = 'InvalidCrawlDomainError';
  }
}
