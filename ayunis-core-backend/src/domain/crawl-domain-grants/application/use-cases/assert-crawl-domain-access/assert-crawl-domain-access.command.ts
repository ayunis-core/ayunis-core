import type { UUID } from 'crypto';

export class AssertCrawlDomainAccessCommand {
  constructor(
    public readonly url: string,
    public readonly orgId: UUID,
  ) {}
}
