import type { UUID } from 'crypto';

export class RevokeCrawlDomainCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly grantId: UUID,
  ) {}
}
