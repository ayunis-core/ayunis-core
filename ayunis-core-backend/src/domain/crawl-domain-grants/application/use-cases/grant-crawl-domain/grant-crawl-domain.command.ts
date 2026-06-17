import type { UUID } from 'crypto';

export class GrantCrawlDomainCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly domain: string,
  ) {}
}
