import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { normalizeHost } from './crawl-domain.util';

export interface CrawlDomainGrantParams {
  id?: UUID;
  orgId: UUID;
  domain: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Binds a single exact host to exactly one organization. While a grant
 * exists for a host, only the owning org may crawl it; every other org is
 * denied. The `domain` is always stored normalized (lowercased host).
 */
export class CrawlDomainGrant {
  id: UUID;
  orgId: UUID;
  domain: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: CrawlDomainGrantParams) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.domain = normalizeHost(params.domain);
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
