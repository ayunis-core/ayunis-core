import type { UUID } from 'crypto';

export class ListOrgCrawlDomainsQuery {
  constructor(public readonly orgId: UUID) {}
}
